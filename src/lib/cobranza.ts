// Regla de cobranza de un pedido: cuánto se debe y cuánto falta.
// Un pedido cobrado "sin factura" se cobra neto de IVA (total / 1.21): la diferencia es descuento, no saldo.

export const IVA_DIV = 1.21;const TOLERANCIA = 1; // $1 de redondeo

export type PagoDePedido = { monto: number | string; sin_factura?: boolean | null };

export function montoDebido(total: number, pagos: PagoDePedido[]): number {
  const sinFactura = pagos.some((p) => p.sin_factura);
  return sinFactura ? Math.round((total / IVA_DIV) * 100) / 100 : total;
}

export function saldoPedido(total: number, pagos: PagoDePedido[]): number {
  const cobrado = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldo = montoDebido(Number(total), pagos) - cobrado;
  return Math.round(saldo * 100) / 100;
}

export function tieneSaldo(total: number, pagos: PagoDePedido[]): boolean {
  return saldoPedido(total, pagos) > TOLERANCIA;
}

// Cuánto se cobró de más (0 si no hay exceso). Detecta cobros duplicados o con monto de más.
export function cobradoDeMas(total: number, pagos: PagoDePedido[]): number {
  const exceso = -saldoPedido(total, pagos);
  return exceso > TOLERANCIA ? Math.round(exceso * 100) / 100 : 0;
}

// Lee los cobros del pedido y devuelve su saldo. `db` es el cliente admin de Supabase.
export async function saldoPedidoDb(db: any, orderId: string): Promise<{ saldo: number; total: number } | null> {
  const [{ data: order }, { data: pagos }] = await Promise.all([
    db.from("orders").select("total").eq("id", orderId).single(),
    db.from("pagos").select("monto, sin_factura").eq("order_id", orderId),
  ]);
  if (!order) return null;
  return { total: Number(order.total), saldo: saldoPedido(Number(order.total), pagos ?? []) };
}
