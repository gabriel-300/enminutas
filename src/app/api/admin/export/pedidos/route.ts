import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = user.app_metadata?.role as string | undefined;
  const STAFF = ["admin", "vendedor", "produccion", "distribucion"];
  if (!STAFF.includes(role ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const mes   = searchParams.get("mes");   // "2026-05"
  const canal = searchParams.get("canal"); // "b2b_mayorista" | "b2c_nacional" | null = todos

  const db = createAdminClient() as any;

  let query = db
    .from("orders")
    .select(`
      order_number, status, channel, total, subtotal, shipping_fee, discount,
      payment_method, payment_confirmed_at, created_at,
      guest_email, guest_phone,
      customer:profiles!customer_id (full_name, phone),
      lines:order_lines (quantity, unit_price, line_total, product_snapshot)
    `)
    .not("status", "eq", "cancelled")
    .order("created_at", { ascending: false });

  if (canal) query = query.eq("channel", canal);
  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 1).toISOString();
    query = query.gte("created_at", from).lt("created_at", to);
  }

  const { data: orders, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const STATUS_LABEL: Record<string, string> = {
    pending_payment: "Pendiente de pago",
    aprobado:        "Aprobado",
    enviado_prod:    "En producción",
    despachado:      "Despachado",
    delivered:       "Entregado",
    cancelled:       "Cancelado",
  };
  const CANAL_LABEL: Record<string, string> = {
    b2b_mayorista: "B2B Mayorista",
    b2c_nacional:  "Tienda online",
  };

  const rows: string[] = [
    ["Número", "Canal", "Estado", "Cliente", "Email", "Teléfono", "Productos", "Subtotal", "Flete", "Descuento", "Total", "Pago", "Pago confirmado", "Fecha"].join(";"),
  ];

  for (const o of orders ?? []) {
    const clientName  = (o as any).customer?.full_name ?? (o as any).guest_email ?? "—";
    const clientEmail = (o as any).guest_email ?? "—";
    const clientPhone = (o as any).customer?.phone ?? (o as any).guest_phone ?? "—";
    const productos   = ((o as any).lines ?? [])
      .map((l: any) => `${l.product_snapshot?.name ?? "?"} x${l.quantity}`)
      .join(" | ");

    rows.push([
      (o as any).order_number,
      CANAL_LABEL[(o as any).channel] ?? (o as any).channel,
      STATUS_LABEL[(o as any).status] ?? (o as any).status,
      clientName,
      clientEmail,
      clientPhone,
      productos,
      Number((o as any).subtotal).toFixed(2),
      Number((o as any).shipping_fee ?? 0).toFixed(2),
      Number((o as any).discount ?? 0).toFixed(2),
      Number((o as any).total).toFixed(2),
      (o as any).payment_method ?? "—",
      (o as any).payment_confirmed_at ? new Date((o as any).payment_confirmed_at).toLocaleDateString("es-AR") : "—",
      new Date((o as any).created_at).toLocaleDateString("es-AR"),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  }

  const filename = `pedidos${mes ? `_${mes}` : ""}${canal ? `_${canal}` : ""}.csv`;
  const bom = "﻿"; // BOM para Excel en español

  return new NextResponse(bom + rows.join("\n"), {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
