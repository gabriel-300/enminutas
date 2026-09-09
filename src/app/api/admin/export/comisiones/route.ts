import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getParametros } from "@/lib/parametros";

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered", "liquidado"];

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
  const mesParam  = searchParams.get("mes");   // 'YYYY-MM'
  const anioParam = searchParams.get("anio");  // 'YYYY'

  const now = new Date();
  const anio = anioParam
    ? Number(anioParam)
    : mesParam
      ? Number(mesParam.split("-")[0])
      : now.getFullYear();

  const db = createAdminClient() as any;
  const { iva_pct, comision_pct } = await getParametros();

  // ── Vendedores (preventistas + la comercializadora) ────────────────────
  const { data: listUsersData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = (listUsersData?.users ?? []) as any[];
  const vendedoresUsers = allUsers.filter((u: any) => u.app_metadata?.role === "vendedor");
  const vendedorIds = vendedoresUsers.map((u: any) => u.id as string);

  // Sin % configurado explícitamente = sin comisión (no se asume el default global).
  const { data: perfilesVendedores } = vendedorIds.length > 0
    ? await db.from("profiles").select("id, comision_preventista_pct, es_comercializadora").in("id", vendedorIds)
    : { data: [] };
  const pctMap: Record<string, number> = {};
  let comercializadoraId: string | null = null;
  for (const p of (perfilesVendedores ?? []) as any[]) {
    pctMap[p.id] = p.comision_preventista_pct != null ? Number(p.comision_preventista_pct) : 0;
    if (p.es_comercializadora) comercializadoraId = p.id;
  }

  const vendedorNombre: Record<string, string> = {};
  for (const u of vendedoresUsers) {
    vendedorNombre[u.id] = (u.user_metadata?.full_name as string | undefined) ?? u.email ?? u.id;
  }

  // ── Clientes B2B: vendedor asignado + % que tienen cargado en su precio ─
  const { data: perfilesClientes } = await db
    .from("profiles")
    .select("id, full_name, vendedor_id, comision_pct_override")
    .eq("role", "customer_b2b");
  const clienteVendedorMap: Record<string, string | null> = {};
  const clientePoolPctMap:  Record<string, number>        = {};
  const clienteNombreMap:   Record<string, string>        = {};
  for (const c of (perfilesClientes ?? []) as any[]) {
    clienteVendedorMap[c.id] = c.vendedor_id ?? null;
    clientePoolPctMap[c.id]  = c.comision_pct_override != null ? Number(c.comision_pct_override) : comision_pct;
    clienteNombreMap[c.id]   = c.full_name ?? "—";
  }
  const clienteIds = Object.keys(clienteVendedorMap);

  // ── Pedidos del año ─────────────────────────────────────────────────────
  const yearStart = new Date(anio, 0, 1).toISOString();
  const yearEnd   = new Date(anio, 11, 31, 23, 59, 59).toISOString();

  const { data: rawOrders } = clienteIds.length > 0
    ? await db.from("orders")
        .select("id, customer_id, total, created_at")
        .in("customer_id", clienteIds)
        .in("status", ACTIVE_STATUSES)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
    : { data: [] };
  const orders = (rawOrders ?? []) as any[];
  const orderIds = orders.map((o) => o.id);

  const { data: pagosSinFactura } = orderIds.length > 0
    ? await db.from("pagos").select("order_id, monto").in("order_id", orderIds).eq("sin_factura", true)
    : { data: [] };
  const netoSinFacturaMap: Record<string, number> = {};
  for (const p of (pagosSinFactura ?? []) as any[]) {
    if (!p.order_id) continue;
    netoSinFacturaMap[p.order_id] = (netoSinFacturaMap[p.order_id] ?? 0) + Number(p.monto);
  }

  const { data: rawPagosComision } = vendedorIds.length > 0
    ? await db.from("comisiones_pagos").select("*").in("vendedor_id", vendedorIds).like("mes", `${anio}-%`)
    : { data: [] };
  const pagoComisionMap: Record<string, any> = {};
  for (const p of (rawPagosComision ?? []) as any[]) {
    pagoComisionMap[`${p.vendedor_id}_${p.mes}`] = p;
  }

  // ── Repartir cada pedido: preventista asignado (tope: pool del cliente) ─
  // + comercializadora (el resto del pool). Ver comentario en la página
  // /admin/comisiones para el detalle del criterio.
  type MesAgg = { ventas: number; comision: number };
  const aggMap: Record<string, Record<string, MesAgg>> = {};
  type ClienteMesAgg = { nombre: string; ventas: number; comision: number };
  const clienteMesMap: Record<string, Record<string, ClienteMesAgg>> = {}; // `${vid}_${mes}` -> clienteId -> agg

  for (const o of orders) {
    const customerId = o.customer_id;
    const d = new Date(o.created_at);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const total = Number(o.total);
    const base  = netoSinFacturaMap[o.id] ?? total;

    const poolPct        = clientePoolPctMap[customerId] ?? comision_pct;
    const divisorCliente  = 1 + iva_pct + poolPct;
    const comisionTotalOrden = poolPct > 0 ? (base * poolPct) / divisorCliente : 0;

    const assignedVid = clienteVendedorMap[customerId];
    const assignedEsOtroQueLaComercializadora = assignedVid && assignedVid !== comercializadoraId;
    const assignedPct = assignedEsOtroQueLaComercializadora ? (pctMap[assignedVid!] ?? 0) : 0;
    const preventistaPctEfectivo = Math.min(assignedPct, poolPct);

    const comisionPreventista = poolPct > 0 ? (base * preventistaPctEfectivo) / divisorCliente : 0;
    const comisionResto       = comisionTotalOrden - comisionPreventista;

    function sumar(vid: string, comisionMonto: number) {
      aggMap[vid] ??= {};
      aggMap[vid][mesKey] ??= { ventas: 0, comision: 0 };
      aggMap[vid][mesKey].ventas   += total;
      aggMap[vid][mesKey].comision += comisionMonto;

      const ckey = `${vid}_${mesKey}`;
      clienteMesMap[ckey] ??= {};
      clienteMesMap[ckey][customerId] ??= { nombre: clienteNombreMap[customerId] ?? "—", ventas: 0, comision: 0 };
      clienteMesMap[ckey][customerId].ventas   += total;
      clienteMesMap[ckey][customerId].comision += comisionMonto;
    }

    if (assignedEsOtroQueLaComercializadora) sumar(assignedVid!, comisionPreventista);
    if (comercializadoraId) sumar(comercializadoraId, comisionResto);
  }

  function comisionDe(vid: string, mesKey: string, live: number) {
    const pago = pagoComisionMap[`${vid}_${mesKey}`];
    return { monto: pago ? Number(pago.monto) : Math.round(live), pagada: !!pago, fechaPago: pago?.fecha_pago ?? "" };
  }

  let rows: string[];
  let filename: string;

  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    // ── Detalle por cliente, un mes ──────────────────────────────────────
    rows = [csvRow(["Vendedor", "Cliente", "Ventas mes", "Comisión", "Estado", "Fecha de pago"])];

    for (const vid of vendedorIds) {
      const clientes = clienteMesMap[`${vid}_${mesParam}`] ?? {};
      const nombre = vendedorNombre[vid] ?? vid;
      const clienteEntries = Object.values(clientes) as ClienteMesAgg[];
      if (clienteEntries.length === 0) continue;

      const { pagada, fechaPago } = comisionDe(vid, mesParam, 0);
      for (const c of clienteEntries) {
        rows.push(csvRow([
          nombre, c.nombre,
          c.ventas.toFixed(2), c.comision.toFixed(2),
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
        const agg = aggMap[vid]?.[mesKey] ?? { ventas: 0, comision: 0 };
        montos.push(comisionDe(vid, mesKey, agg.comision).monto);
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
