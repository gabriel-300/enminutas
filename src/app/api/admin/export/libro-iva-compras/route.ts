import { mesValido } from "@/lib/fecha";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CATEGORIAS_GASTO } from "@/lib/proveedores";

const GRUPO_LABEL: Record<string, string> = {
  materia_prima:   "Materia prima",
  gastos_fabrica:  "Gastos de fábrica",
  estructura:      "Estructura",
};

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

  let query = db
    .from("recepciones")
    .select("tipo, numero, fecha, proveedor, proveedor_cuit, neto, iva, otros_impuestos, total, grupo_gasto, categoria_gasto")
    .order("fecha", { ascending: true });

  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const to   = new Date(year, month, 1).toISOString().slice(0, 10);
    query = query.gte("fecha", from).lt("fecha", to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const catLabel = (v: string | null) => CATEGORIAS_GASTO.find(c => c.value === v)?.label ?? v ?? "—";

  const rows: string[] = [
    ["Fecha", "Tipo", "Número", "Proveedor", "CUIT", "Grupo", "Categoría", "Neto", "IVA", "Otros impuestos", "Total"].join(";"),
  ];
  for (const r of (data ?? []) as any[]) {
    rows.push([
      new Date(r.fecha + "T12:00:00").toLocaleDateString("es-AR"),
      r.tipo === "factura" ? "Factura" : r.tipo === "remito" ? "Remito" : "Gasto",
      r.numero,
      r.proveedor,
      r.proveedor_cuit ?? "—",
      GRUPO_LABEL[r.grupo_gasto] ?? r.grupo_gasto,
      r.tipo === "gasto" ? catLabel(r.categoria_gasto) : "—",
      Number(r.neto ?? 0).toFixed(2),
      Number(r.iva ?? 0).toFixed(2),
      Number(r.otros_impuestos ?? 0).toFixed(2),
      Number(r.total ?? 0).toFixed(2),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  }

  const filename = `libro-iva-compras${mes ? `_${mes}` : ""}.csv`;
  const bom = "﻿";
  return new NextResponse(bom + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
