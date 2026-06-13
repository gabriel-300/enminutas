// Fórmula de precios B2B — En Minutas v5
// Especificación: EnMinutas_EspecTecnica_ListaPrecios_v5.pdf
//
// FINAL c/IVA = (lista_siva × 1.21) + (lista_siva × 0.15)
// El IVA se aplica SOLO sobre lista_siva, NO sobre la comisión.

export type PrecioB2B = {
  lista_siva:    number;
  lista_civa:    number;
  comision:      number;
  final_civa:    number;   // precio que paga el cliente por la caja
  precio_unidad: number;   // final_civa ÷ total de unidades individuales
  pvp_unidad:    number;   // precio sugerido al consumidor por unidad
  precio_cajita: number;   // final_civa ÷ bolsas/cajitas (display alternativo)
  costo_viaje:   number;   // flete zona — se muestra separado, nunca en precio
};

export function calcularPrecio(p: {
  costo:              number;
  bolsas_caja:        number;
  pkg_unitario:       number;
  pkg_bulto:          number;
  u_bolsa:            number;
  categoria:          string;           // 'Estándar' | 'Premium'
  divisiones_display: number | null;
  margen_std:         number;           // ej: 0.40
  margen_premium:     number;           // ej: 0.45
  markup_pvp:         number;           // ej: 0.80
  flete_kg?:          number;           // siempre 0 en v5; contemplado para futuro
  km?:                number;
  precio_km?:         number;
}): PrecioB2B {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const r0 = (n: number) => Math.round(n);

  const margen = p.categoria === 'Premium' ? p.margen_premium : p.margen_std;

  // Paso 2 — Lista s/IVA
  const lista_siva = r2(
    (p.costo * p.bolsas_caja) / (1 - margen)
    + p.pkg_unitario * p.bolsas_caja
    + p.pkg_bulto,
  );

  // Paso 3 — Lista c/IVA (IVA solo sobre lista_siva)
  const lista_civa = r2(lista_siva * 1.21);

  // Paso 4 — Comisión 15% (sin IVA adicional)
  const comision = r2(lista_siva * 0.15);

  // Paso 5 — FINAL c/IVA
  const flete_kg_total = r2((p.flete_kg ?? 0) * (p.bolsas_caja ?? 1));
  const final_civa = r0(lista_civa + comision + flete_kg_total);

  // Paso 6 — Precio por unidad
  const div_unidades = p.divisiones_display != null
    ? p.u_bolsa * p.divisiones_display
    : p.u_bolsa * p.bolsas_caja;
  const precio_unidad = r0(final_civa / div_unidades);

  // Paso 7 — PVP sugerido por unidad
  const pvp_unidad = r0(final_civa * (1 + p.markup_pvp) / div_unidades);

  // Paso 8 — Precio por cajita/bolsa
  const div_cajitas  = p.divisiones_display ?? p.bolsas_caja;
  const precio_cajita = r0(final_civa / div_cajitas);

  // Paso 9 — Flete por viaje (cobrado aparte, no en el precio)
  const costo_viaje = r0((p.km ?? 0) * 2 * (p.precio_km ?? 0));

  return {
    lista_siva, lista_civa, comision, final_civa,
    precio_unidad, pvp_unidad, precio_cajita,
    costo_viaje,
  };
}

export function formatPrecio(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}
