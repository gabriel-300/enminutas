export type Canal = {
  id:            string;
  slug:          string;
  nombre:        string;
  descuento_pct: number;
};

export type PrecioB2B = {
  total_civa:  number;
  por_unidad:  number;
  desglose: {
    precio_lista:    number;
    descuento_canal: number;  // % canal
    descuento_extra: number;  // % extra del cliente
    descuento_total: number;  // % combinado
    precio_canal:    number;  // lista × (1 - total)
    flete:           number;
  };
};

/**
 * Calcula el precio final para un cliente dado su canal y zona.
 *
 * precio_final = precio_lista × (1 - descuento_canal - descuento_extra) + kg_caja × flete_kg
 */
export function precioParaCanal(
  precio_lista:        number | null,
  canal_descuento_pct: number,        // canales.descuento_pct
  descuento_extra_pct: number,        // profiles.descuento_extra_pct
  flete_kg:            number,        // delivery_zones.flete_kg
  kg_caja:             number | null,
  bolsas_caja:         number | null,
): PrecioB2B | null {
  if (!precio_lista) return null;

  const descuento_total = (canal_descuento_pct + descuento_extra_pct) / 100;
  const precio_canal    = precio_lista * (1 - descuento_total);
  const flete           = (kg_caja ?? 0) * flete_kg;
  const total_civa      = Math.round(precio_canal + flete);
  const por_unidad      = bolsas_caja
    ? Math.round((total_civa / bolsas_caja) * 100) / 100
    : total_civa;

  return {
    total_civa,
    por_unidad,
    desglose: {
      precio_lista,
      descuento_canal: canal_descuento_pct,
      descuento_extra: descuento_extra_pct,
      descuento_total: canal_descuento_pct + descuento_extra_pct,
      precio_canal:    Math.round(precio_canal),
      flete:           Math.round(flete),
    },
  };
}
