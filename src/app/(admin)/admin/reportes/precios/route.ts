import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";

export async function GET(req: NextRequest) {
  const adminClient = createAdminClient();
  const params = await getParametros();
  const canalSlug = req.nextUrl.searchParams.get("canal") ?? "dist";

  const CANAL_LABEL: Record<string, string> = {
    dist:   "Distribuidor / Franquicia",
    gastro: "Gastronomía",
    min:    "Minorista",
  };

  const { data: canal } = await (adminClient as any)
    .from("canales")
    .select("margen_std, margen_premium, markup_pvp")
    .eq("slug", canalSlug)
    .single();

  if (!canal) {
    return new NextResponse("Canal no encontrado", { status: 404 });
  }

  const { data: zonas } = await (adminClient as any)
    .from("delivery_zones")
    .select("id, name, km, precio_km")
    .order("name");

  const { data: rawProducts } = await (adminClient as any)
    .from("products")
    .select(`
      id, name, sku, unit_label, codigo, presentacion,
      bolsas_caja, kg_caja, u_bolsa,
      costo, pkg_unitario, pkg_bulto,
      categoria, divisiones_display,
      linea:lineas_producto!linea_id (nombre)
    `)
    .eq("is_active", true)
    .not("codigo", "is", null)
    .order("codigo");

  const zonasList = (zonas ?? []) as Array<{
    id: string; name: string; km: number; precio_km: number;
  }>;

  const headers = [
    "Cód", "Línea", "Producto", "Presentación", "Categoría",
    "u/cajita", "cajas", "kg/caja",
    "Lista s/IVA", "Lista c/IVA", `Comisión ${Math.round(params.comision_pct * 100)}%`, "FINAL s/IVA", "FINAL c/IVA",
    "$/u", "PVP/u", "PVP/cajita",
    ...zonasList.map((z) => `Flete ${z.name}`),
  ];

  const rows: string[][] = [];

  for (const p of rawProducts ?? []) {
    if (!p.costo || !p.bolsas_caja || !p.u_bolsa || !p.categoria) continue;

    const precio = calcularPrecio({
      costo:              Number(p.costo),
      bolsas_caja:        Number(p.bolsas_caja),
      pkg_unitario:       Number(p.pkg_unitario ?? 0),
      pkg_bulto:          Number(p.pkg_bulto ?? 0),
      u_bolsa:            Number(p.u_bolsa),
      categoria:          p.categoria,
      divisiones_display: p.divisiones_display ?? null,
      margen_std:         Number(canal.margen_std),
      margen_premium:     Number(canal.margen_premium),
      markup_pvp:         Number(canal.markup_pvp),
      iva_pct:            params.iva_pct,
      comision_pct:       params.comision_pct,
    });

    const final_siva = Math.round(precio.lista_siva + precio.comision);

    const zonaFletes = zonasList.map((z) => {
      const costo_viaje = Math.round(z.km * 2 * z.precio_km);
      return costo_viaje > 0 ? String(costo_viaje) : "$0";
    });

    rows.push([
      String(p.codigo ?? ""),
      (p.linea as any)?.nombre ?? "",
      p.name,
      p.presentacion ?? p.unit_label ?? "",
      p.categoria,
      String(p.u_bolsa),
      String(p.bolsas_caja),
      String(p.kg_caja ?? ""),
      String(precio.lista_siva),
      String(precio.lista_civa),
      String(precio.comision),
      String(final_siva),
      String(precio.final_civa),
      String(precio.precio_unidad),
      String(precio.pvp_unidad),
      String(precio.precio_cajita),
      ...zonaFletes,
    ]);
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const canalLabel = CANAL_LABEL[canalSlug] ?? canalSlug;
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lista-precios-${canalSlug}-${fecha}.csv"`,
      "X-Canal":             canalLabel,
    },
  });
}
