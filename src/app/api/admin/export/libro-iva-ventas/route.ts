import { mesValido } from "@/lib/fecha";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getParametros } from "@/lib/parametros";

// Reconoce la venta al entregar (mismo criterio que comisiones): delivered, entrega_parcial
// o ya liquidado. No hay facturación electrónica todavía (tarea 87): esto es un borrador
// derivado de los pedidos, con el IVA calculado por diferencia (total c/IVA ÷ (1+iva_pct)),
// no el desglose real de una factura. Confirmar el formato final con el contador.
const ESTADOS_RECONOCIDOS = ["delivered", "entrega_parcial", "liquidado"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const mesRaw = searchParams.get("mes");
  const mes    = mesValido(mesRaw);
  if (mesRaw && !mes) return NextResponse.json({ error: "Parámetro mes inválido (formato YYYY-MM)" }, { status: 400 });

  const db = createAdminClient() as any;
  const params = await getParametros();
  const ivaDiv = 1 + params.iva_pct;

  let query = db
    .from("orders")
    .select("order_number, channel, total, entregado_at, guest_email, customer:profiles!customer_id(full_name)")
    .in("status", ESTADOS_RECONOCIDOS)
    .not("entregado_at", "is", null)
    .order("entregado_at", { ascending: true });

  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 1).toISOString();
    query = query.gte("entregado_at", from).lt("entregado_at", to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const CANAL_LABEL: Record<string, string> = { b2b_mayorista: "B2B Mayorista", b2c_nacional: "Tienda online" };

  const rows: string[] = [
    ["Fecha entrega", "Pedido", "Canal", "Cliente", "Total c/IVA", "Neto (aprox.)", "IVA (aprox.)"].join(";"),
  ];
  for (const o of (data ?? []) as any[]) {
    const total = Number(o.total ?? 0);
    const neto  = Math.round((total / ivaDiv) * 100) / 100;
    const iva   = Math.round((total - neto) * 100) / 100;
    rows.push([
      new Date(o.entregado_at).toLocaleDateString("es-AR"),
      o.order_number,
      CANAL_LABEL[o.channel] ?? o.channel,
      o.customer?.full_name ?? o.guest_email ?? "—",
      total.toFixed(2),
      neto.toFixed(2),
      iva.toFixed(2),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  }

  const filename = `libro-iva-ventas-borrador${mes ? `_${mes}` : ""}.csv`;
  const bom = "﻿";
  return new NextResponse(bom + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
