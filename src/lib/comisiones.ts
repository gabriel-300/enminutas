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

export type LineaPedidoValor = { product_id: string; line_total: number };
export type LineaEntregaSnapshot = { productId: string; pedido: number; entregado: number };

/**
 * Fracción (0–1) del valor del pedido que se entregó de verdad. `confirmarEntregaParcial` no
 * recalcula orders.total: solo guarda en delivered_snapshot cuánto se pidió y cuánto se entregó
 * por producto. Se pondera por line_total de cada línea; una línea que no figura en el snapshot
 * se considera entregada completa. Sin snapshot (entrega total) devuelve 1.
 */
export function proporcionEntregada(
  lineas: LineaPedidoValor[],
  snapshot: LineaEntregaSnapshot[] | null | undefined,
): number {
  if (!snapshot?.length) return 1;
  const porProducto = new Map(snapshot.map((l) => [l.productId, l]));

  let total = 0;
  let entregado = 0;
  for (const l of lineas) {
    const valor = Number(l.line_total);
    const s = porProducto.get(l.product_id);
    const ratio = s && s.pedido > 0 ? Math.min(Math.max(s.entregado / s.pedido, 0), 1) : 1;
    total += valor;
    entregado += valor * ratio;
  }
  return total > 0 ? entregado / total : 1;
}

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
