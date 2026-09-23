// Fórmula de precios B2B — En Minutas v5
// Especificación: EnMinutas_EspecTecnica_ListaPrecios_v5.pdf
//
// FINAL c/IVA = (lista_siva × 1.21) + (lista_siva × 0.15) + (lista_siva × flete_pct × 1.21)
// El IVA se aplica SOLO sobre lista_siva y el flete, NO sobre la comisión.
// El flete es CIF: un % de lista_siva por zona, incluido en el precio (no se cobra aparte).

export type PrecioB2B = {
  lista_siva:    number;
  lista_civa:    number;
  comision:      number;
  flete:         number;   // flete CIF c/IVA incluido en final_civa (0 si la zona no tiene)
  final_civa:    number;   // precio que paga el cliente por la caja
  precio_unidad: number;   // final_civa ÷ total de unidades individuales
  pvp_unidad:    number;   // precio sugerido al consumidor por unidad
  precio_cajita: number;   // final_civa ÷ bolsas/cajitas (display alternativo)
};

export function calcularPrecio(p: {
  costo:              number;
  bolsas_caja:        number;
  pkg_unitario:       number;
  pkg_bulto:          number;
  u_bolsa:            number;
  categoria:          string;           // 'Estándar' | 'Premium'
  divisiones_display: number | null;
  margen_std:            number;           // ej: 0.40
  margen_premium:        number;           // ej: 0.45
  margen_venta_directa?: number;           // ej: 0.35 — cuando categoria === 'Venta directa'
  markup_pvp:            number;           // ej: 0.80
  iva_pct?:           number;           // default 0.21
  comision_pct?:      number;           // default 0.15
  flete_pct?:         number;           // ej: 0.02 = 2% de lista_siva (zona de destino); default 0
}): PrecioB2B {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const r0 = (n: number) => Math.round(n);

  const margen      = p.categoria === 'Premium'
    ? p.margen_premium
    : p.categoria === 'Venta directa' && p.margen_venta_directa != null
      ? p.margen_venta_directa
      : p.margen_std;
  const iva         = p.iva_pct      ?? 0.21;
  const comision_pct = p.comision_pct ?? 0.15;

  // Paso 2 — Lista s/IVA
  const lista_siva = r2(
    (p.costo * p.bolsas_caja) / (1 - margen)
    + p.pkg_unitario * p.bolsas_caja
    + p.pkg_bulto,
  );

  // Paso 3 — Lista c/IVA (IVA solo sobre lista_siva)
  const lista_civa = r2(lista_siva * (1 + iva));

  // Paso 4 — Comisión (sin IVA adicional)
  const comision = r2(lista_siva * comision_pct);

  // Paso 5 — Flete CIF (% de lista_siva por zona, con IVA; fuera de la base de comisión)
  const flete = r2(lista_siva * (p.flete_pct ?? 0) * (1 + iva));

  // Paso 6 — FINAL c/IVA
  const final_civa = r0(lista_civa + comision + flete);

  // Paso 7 — Precio por unidad
  const div_unidades = p.divisiones_display != null
    ? p.u_bolsa * p.divisiones_display
    : p.u_bolsa * p.bolsas_caja;
  const precio_unidad = r0(final_civa / div_unidades);

  // Paso 8 — PVP sugerido por unidad
  const pvp_unidad = r0(final_civa * (1 + p.markup_pvp) / div_unidades);

  // Paso 9 — Precio por cajita/bolsa
  const div_cajitas  = p.divisiones_display ?? p.bolsas_caja;
  const precio_cajita = r0(final_civa / div_cajitas);

  return {
    lista_siva, lista_civa, comision, flete, final_civa,
    precio_unidad, pvp_unidad, precio_cajita,
  };
}

export function formatPrecio(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}
