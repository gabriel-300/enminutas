export type ComisionOrdenInput = {
  /** Total c/IVA del pedido; o lo efectivamente cobrado si fue un pedido "sin factura". */
  base: number;
  ivaPct: number;
  /** % de comisión que el cliente tiene cargado en su precio (override del cliente o el % global). */
  poolPct: number;
  /** % del preventista asignado; 0 si el cliente no tiene o si el asignado es la comercializadora. */
  preventistaPct: number;
};

export type ComisionOrden = {
  /** Pool completo de la orden (preventista + comercializadora). */
  total: number;
  preventista: number;
  /** % efectivo del preventista: nunca supera el pool del cliente. */
  preventistaPct: number;
  /** Lo que queda del pool para la comercializadora. */
  comercializadora: number;
  comercializadoraPct: number;
};

// El pool sale del precio: base × pool / (1 + IVA + pool). El preventista se queda con su %
// (tope: el pool del cliente) y la comercializadora con el resto. Un cliente con pool 0 no
// genera comisión para nadie. Ver /admin/comisiones y el export de comisiones.
export function calcularComisionOrden({ base, ivaPct, poolPct, preventistaPct }: ComisionOrdenInput): ComisionOrden {
  const divisor = 1 + ivaPct + poolPct;
  const total = poolPct > 0 ? (base * poolPct) / divisor : 0;

  const preventistaPctEfectivo = Math.min(preventistaPct, poolPct);
  const preventista = poolPct > 0 ? (base * preventistaPctEfectivo) / divisor : 0;

  return {
    total,
    preventista,
    preventistaPct: preventistaPctEfectivo,
    comercializadora: total - preventista,
    comercializadoraPct: Math.max(poolPct - preventistaPctEfectivo, 0),
  };
}
