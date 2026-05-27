export type PrecioB2B = {
  lista_siva: number;
  comision:   number;
  flete:      number;
  total_siva: number;
  total_civa: number;
};

export function calcPrecio(
  costo:        number | null,
  kg_caja:      number | null,
  bolsas_caja:  number | null,
  pkg_unitario: number | null,
  pkg_bulto:    number | null,
  mult_bolsas:  boolean | null,
  margen:       number,
  flete_kg:     number,
): PrecioB2B | null {
  if (!costo || !kg_caja || !bolsas_caja) return null;

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
  return {
    lista_siva: r(lista_siva),
    comision:   r(comision),
    flete:      r(flete),
    total_siva: r(total_siva),
    total_civa: r(total_civa),
  };
}

export function margenParaCanal(
  canal: string | null,
  margen_dist:   number | null,
  margen_gastro: number | null,
  margen_min:    number | null,
): number {
  if (canal === "dist")   return margen_dist   ?? 0.35;
  if (canal === "gastro") return margen_gastro ?? 0.40;
  return margen_min ?? 0.45;
}
