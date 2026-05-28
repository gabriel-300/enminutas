import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Fórmula de precios B2B
function calcPrecio(
  costo:        number,
  kg_caja:      number,
  bolsas_caja:  number,
  pkg_unitario: number,
  pkg_bulto:    number,
  mult_bolsas:  boolean,
  margen:       number,
  flete_kg:     number,
) {
  const pkg_u = pkg_unitario ?? 0;
  const pkg_b = pkg_bulto ?? 0;
  const mult  = mult_bolsas ?? true;

  const lista_siva = mult
    ? (costo * bolsas_caja) / (1 - margen) + pkg_u * bolsas_caja + pkg_b
    : costo / (1 - margen) + pkg_u + pkg_b;

  const comision   = lista_siva * 0.15;
  const flete      = kg_caja * flete_kg;
  const total_siva = lista_siva + comision + flete;
  const total_civa = total_siva * 1.21;

  const r = (n: number) => Math.round(n * 100) / 100;
  return { lista_siva: r(lista_siva), comision: r(comision), flete: r(flete), total_siva: r(total_siva), total_civa: r(total_civa) };
}

export async function GET(req: NextRequest) {
  const adminClient = createAdminClient();
  const canal = req.nextUrl.searchParams.get("canal") ?? "dist";

  const MARGEN_FIELD: Record<string, string> = {
    dist:   "margen_dist",
    gastro: "margen_gastro",
    min:    "margen_min",
  };
  const MARGEN_DEFAULT: Record<string, number> = {
    dist: 0.35, gastro: 0.40, min: 0.45,
  };
  const CANAL_LABEL: Record<string, string> = {
    dist: "Distribuidor", gastro: "Gastronomía", min: "Minorista",
  };

  const { data: zonas } = await (adminClient as any)
    .from("delivery_zones")
    .select("id, name, flete_kg")
    .order("name");

  const { data: rawProducts } = await (adminClient as any)
    .from("products")
    .select(`
      id, name, sku, unit_label, bolsas_caja, kg_caja,
      costo, pkg_unitario, pkg_bulto, mult_bolsas,
      margen_dist, margen_gastro, margen_min,
      category:categories!category_id (name)
    `)
    .eq("is_active", true)
    .order("name");

  const margenField = MARGEN_FIELD[canal] ?? "margen_dist";
  const margenDefault = MARGEN_DEFAULT[canal] ?? 0.35;

  // Cabecera con una columna de precio total por zona
  const zonasList = (zonas ?? []) as Array<{ id: string; name: string; flete_kg: number | null }>;
  const activeZonas = zonasList.filter((z) => z.flete_kg != null);

  const headers = [
    "Categoría", "Producto", "SKU", "Presentación", "U/caja", "Kg/caja",
    "Lista s/IVA", "Comisión (15%)",
    ...activeZonas.map((z) => `Total c/IVA — ${z.name}`),
  ];

  const rows: string[][] = [];

  for (const p of rawProducts ?? []) {
    if (!p.costo || !p.kg_caja || !p.bolsas_caja) continue;
    const margen = (p as any)[margenField] ?? margenDefault;

    const base = calcPrecio(
      p.costo, p.kg_caja, p.bolsas_caja,
      p.pkg_unitario ?? 0, p.pkg_bulto ?? 0, p.mult_bolsas ?? true,
      margen, 0,
    );

    const zonaCols = activeZonas.map((z) => {
      const p2 = calcPrecio(
        p.costo, p.kg_caja, p.bolsas_caja,
        p.pkg_unitario ?? 0, p.pkg_bulto ?? 0, p.mult_bolsas ?? true,
        margen, z.flete_kg!,
      );
      return String(p2.total_civa);
    });

    rows.push([
      (p.category as any)?.name ?? "",
      p.name,
      p.sku ?? "",
      p.unit_label ?? "",
      String(p.bolsas_caja),
      String(p.kg_caja),
      String(base.lista_siva),
      String(base.comision),
      ...zonaCols,
    ]);
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const canalLabel = CANAL_LABEL[canal] ?? canal;
  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `lista-precios-${canal}-${fecha}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
