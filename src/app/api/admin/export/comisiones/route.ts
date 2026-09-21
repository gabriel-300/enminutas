import { cargarComisionesAnio, type ClienteMesAgg } from "@/lib/comisiones-data";
import { mesAR, mesValido, anioValido } from "@/lib/fecha";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";


const csvRow = (vals: (string | number)[]) =>
  vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const mesRaw    = searchParams.get("mes");   // 'YYYY-MM'
  const anioRaw   = searchParams.get("anio");  // 'YYYY'
  const mesParam  = mesValido(mesRaw);
  const anioParam = anioValido(anioRaw);

  if ((mesRaw && !mesParam) || (anioRaw && anioParam === null)) {
    return NextResponse.json({ error: "Parámetros inválidos (mes: YYYY-MM, anio: YYYY)" }, { status: 400 });
  }

  const now = new Date();
  const anio = anioParam ?? (mesParam ? Number(mesParam.split("-")[0]) : Number(mesAR(now).slice(0, 4)));

  const db = createAdminClient() as any;

  // Vendedores y comisión por vendedor × mes × cliente (criterio: pedidos entregados).
  const { vendedores, agg } = await cargarComisionesAnio(anio);
  const vendedorIds = vendedores.map((v) => v.id);
  const vendedorNombre: Record<string, string> = {};
  for (const v of vendedores) vendedorNombre[v.id] = v.nombre;

  const { data: rawPagosComision } = vendedorIds.length > 0
    ? await db.from("comisiones_pagos").select("*").in("vendedor_id", vendedorIds).like("mes", `${anio}-%`)
    : { data: [] };
  const pagoComisionMap: Record<string, any> = {};
  for (const p of (rawPagosComision ?? []) as any[]) {
    pagoComisionMap[`${p.vendedor_id}_${p.mes}_${p.cliente_id}`] = p;
  }

  function comisionDeCliente(vid: string, mesKey: string, clienteId: string, live: number) {
    const pago = pagoComisionMap[`${vid}_${mesKey}_${clienteId}`];
    return { monto: pago ? Number(pago.monto) : Math.round(live), pagada: !!pago, fechaPago: pago?.fecha_pago ?? "" };
  }

  let rows: string[];
  let filename: string;

  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    // ── Detalle por cliente, un mes ──────────────────────────────────────
    rows = [csvRow(["Vendedor", "Cliente", "Entregado mes", "Comisión", "Estado", "Fecha de pago"])];

    for (const vid of vendedorIds) {
      const clientes = agg[vid]?.[mesParam] ?? {};
      const nombre = vendedorNombre[vid] ?? vid;
      const clienteEntries = Object.entries(clientes) as [string, ClienteMesAgg][];
      if (clienteEntries.length === 0) continue;

      for (const [clienteId, c] of clienteEntries) {
        const { monto, pagada, fechaPago } = comisionDeCliente(vid, mesParam, clienteId, c.comisionLive);
        rows.push(csvRow([
          nombre, c.nombre,
          c.ventas.toFixed(2), monto.toFixed(2),
          pagada ? "Pagada" : "Pendiente", fechaPago,
        ]));
      }
    }
    filename = `comisiones_${mesParam}.csv`;
  } else {
    // ── Resumen anual, un vendedor por fila ──────────────────────────────
    rows = [csvRow(["Vendedor", ...Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}`), "Total año"])];

    for (const vid of vendedorIds) {
      const nombre = vendedorNombre[vid] ?? vid;
      const montos: number[] = [];
      for (let i = 0; i < 12; i++) {
        const mesKey = `${anio}-${String(i + 1).padStart(2, "0")}`;
        const clientes = agg[vid]?.[mesKey] ?? {};
        const montoMes = Object.entries(clientes).reduce(
          (s, [clienteId, c]) => s + comisionDeCliente(vid, mesKey, clienteId, (c as ClienteMesAgg).comisionLive).monto,
          0,
        );
        montos.push(montoMes);
      }
      const total = montos.reduce((s, m) => s + m, 0);
      rows.push(csvRow([nombre, ...montos.map((m) => m.toFixed(2)), total.toFixed(2)]));
    }
    filename = `comisiones_${anio}.csv`;
  }

  const bom = "﻿"; // BOM para Excel en español
  return new NextResponse(bom + rows.join("\n"), {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
