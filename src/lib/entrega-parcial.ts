// Cálculo de una entrega parcial. Lo que no se entrega se CIERRA: el pedido queda con las cantidades
// y el total de lo efectivamente entregado (order_lines + orders.total), y lo pedido originalmente
// queda solo en orders.delivered_snapshot. No existe un "pendiente" que siga abierto.

export const MOTIVOS_FALTANTE = [
  { value: "sin_stock",  label: "Faltó mercadería al cargar" },
  { value: "rechazado",  label: "El cliente no lo quiso o no lo necesitaba" },
  { value: "danado",     label: "Llegó dañado o en mal estado" },
  { value: "otro",       label: "Otro motivo" },
] as const;

export type MotivoFaltante = (typeof MOTIVOS_FALTANTE)[number]["value"];

export function esMotivoFaltante(v: unknown): v is MotivoFaltante {
  return MOTIVOS_FALTANTE.some((m) => m.value === v);
}

export type LineaPedidoDB = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_snapshot?: { name?: string } | null;
};

export type EntregaLineaInput = { lineId: string; entregado: number };

export type LineaEntregaCalculada = {
  lineId: string;
  productId: string;
  name: string;
  pedido: number;
  entregado: number;
  unitPrice: number;
  lineTotal: number;
};

export type EntregaParcialCalculada = {
  lineas: LineaEntregaCalculada[];
  subtotal: number;
  descuento: number;
  total: number;
  todoEntregado: boolean;
  nadaEntregado: boolean;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Las cantidades pedidas y los precios salen SIEMPRE de la base (`lineas`); del cliente solo se toma
 * cuánto se entregó de cada línea. Una línea que no viene en `entregas` se toma como entregada completa.
 * El descuento se conserva (con tope en el subtotal); flete y cargo adicional se mantienen enteros.
 */
export function calcularEntregaParcial(input: {
  lineas: LineaPedidoDB[];
  entregas: EntregaLineaInput[];
  descuento: number;
  flete: number;
  cargoAdicional: number;
}): EntregaParcialCalculada {
  const porId = new Map(input.lineas.map((l) => [l.id, l]));
  const entregadoPorLinea = new Map<string, number>();

  for (const e of input.entregas) {
    if (!porId.has(e.lineId)) throw new Error("Una de las líneas no pertenece a este pedido");
    if (entregadoPorLinea.has(e.lineId)) throw new Error("Una línea viene repetida en la entrega");
    if (typeof e.entregado !== "number" || !Number.isInteger(e.entregado) || e.entregado < 0)
      throw new Error("Las cantidades entregadas deben ser números enteros mayores o iguales a 0");
    entregadoPorLinea.set(e.lineId, e.entregado);
  }

  const lineas: LineaEntregaCalculada[] = input.lineas.map((l) => {
    const pedido = Number(l.quantity);
    const entregado = entregadoPorLinea.get(l.id) ?? pedido;
    if (entregado > pedido)
      throw new Error(`No se puede entregar más de lo pedido (${l.product_snapshot?.name ?? "producto"}: ${entregado} de ${pedido})`);
    const unitPrice = Number(l.unit_price);
    return {
      lineId:    l.id,
      productId: l.product_id,
      name:      l.product_snapshot?.name ?? "Producto",
      pedido,
      entregado,
      unitPrice,
      lineTotal: r2(unitPrice * entregado),
    };
  });

  const subtotal  = r2(lineas.reduce((s, l) => s + l.lineTotal, 0));
  const descuento = Math.min(Math.max(input.descuento, 0), subtotal);
  const total     = r2(subtotal - descuento + input.flete + input.cargoAdicional);

  return {
    lineas,
    subtotal,
    descuento,
    total,
    todoEntregado:  lineas.every((l) => l.entregado >= l.pedido),
    nadaEntregado:  lineas.every((l) => l.entregado <= 0),
  };
}
