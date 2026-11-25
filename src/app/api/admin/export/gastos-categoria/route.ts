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
    .select("fecha, grupo_gasto, categoria_gasto, neto, iva, total");

  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const to   = new Date(year, month, 1).toISOString().slice(0, 10);
    query = query.gte("fecha", from).lt("fecha", to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const catLabel = (v: string | null) => CATEGORIAS_GASTO.find(c => c.value === v)?.label ?? v ?? "—";

  // Agrupa por grupo_gasto + categoria_gasto (la categoría solo distingue adentro de "gasto")
  const map = new Map<string, { grupo: string; categoria: string; cantidad: number; neto: number; iva: number; total: number }>();
  for (const r of (data ?? []) as any[]) {
    const categoria = r.grupo_gasto === "materia_prima" ? "—" : catLabel(r.categoria_gasto);
    const key = `${r.grupo_gasto}|${categoria}`;
    const acc = map.get(key) ?? { grupo: GRUPO_LABEL[r.grupo_gasto] ?? r.grupo_gasto, categoria, cantidad: 0, neto: 0, iva: 0, total: 0 };
    acc.cantidad += 1;
    acc.neto  += Number(r.neto ?? 0);
    acc.iva   += Number(r.iva ?? 0);
    acc.total += Number(r.total ?? 0);
    map.set(key, acc);
  }

  const rows: string[] = [["Grupo", "Categoría", "Cantidad", "Neto", "IVA", "Total"].join(";")];
  for (const a of Array.from(map.values()).sort((x, y) => y.total - x.total)) {
    rows.push([a.grupo, a.categoria, String(a.cantidad), a.neto.toFixed(2), a.iva.toFixed(2), a.total.toFixed(2)]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  }

  const filename = `gastos-por-categoria${mes ? `_${mes}` : ""}.csv`;
  const bom = "﻿";
  return new NextResponse(bom + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
