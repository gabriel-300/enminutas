export type PrecioB2B = {
  total_civa: number;
  por_unidad: number;
};

export function precioParaCanal(
  canal:         string | null,
  precio_dist:   number | null,
  precio_gastro: number | null,
  precio_min:    number | null,
  bolsas_caja:   number | null,
): PrecioB2B | null {
  const total_civa =
    canal === "dist"   ? precio_dist :
    canal === "gastro" ? precio_gastro :
                         precio_min;

  if (!total_civa) return null;

  const por_unidad = bolsas_caja
    ? Math.round((total_civa / bolsas_caja) * 100) / 100
    : total_civa;

  return { total_civa, por_unidad };
}
