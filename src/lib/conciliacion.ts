// Conciliación del saldo de la planilla de cuentas corrientes de Alex (importada en cc_movimientos)
// contra la deuda que calcula el sistema a la misma fecha de corte.
// No se suma a "Deuda clientes": los cargos importados son copias de pedidos que ya cuenta el sistema.
// Sirve para detectar diferencias: cobros no cargados, pedidos que la planilla no tiene, etc.

import { montoDebido } from "./cobranza";

export type SaldoAlex = { cliente_id: string; monto: number };
export type PedidoConc = { id: string; cliente_id: string; total: number; fecha: string }; // fecha YYYY-MM-DD (entrega)
export type PagoConc = { order_id: string | null; cliente_id: string; monto: number; fecha: string; sin_factura?: boolean | null };

export type FilaConciliacion = {
  cliente_id: string;
  saldoAlex: number;
  deudaSistema: number;
  diferencia: number; // saldoAlex - deudaSistema (positivo: la planilla de Alex dice que deben más)
  pedidos: number;    // pedidos del sistema con saldo al corte
};

// Redondea a centavos; lo que no llega al peso se toma como 0 (evita mostrar "-$ 0").
const r2 = (n: number) => (Math.abs(n) < 0.5 ? 0 : Math.round(n * 100) / 100);

/** Extrae la fecha de corte ("... al 14/10/2026") de la descripción de la importación → YYYY-MM-DD. */
export function fechaCorteDeDescripcion(descripcion: string | null | undefined): string | null {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(descripcion ?? "");
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/**
 * Deuda del sistema por cliente a la fecha de corte: pedidos entregados hasta el corte, con su regla de
 * "sin factura" (se debe el neto de IVA), menos los cobros con fecha hasta el corte y los cobros a cuenta.
 */
export function conciliar(input: {
  saldosAlex: SaldoAlex[];
  pedidos: PedidoConc[];
  pagos: PagoConc[];
  corte: string;
}): FilaConciliacion[] {
  const { saldosAlex, pedidos, pagos, corte } = input;

  const pagosPorPedido = new Map<string, PagoConc[]>();
  const aCuenta = new Map<string, number>();
  for (const p of pagos) {
    if (p.order_id) {
      const l = pagosPorPedido.get(p.order_id) ?? [];
      l.push(p);
      pagosPorPedido.set(p.order_id, l);
    } else if (p.fecha <= corte) {
      aCuenta.set(p.cliente_id, (aCuenta.get(p.cliente_id) ?? 0) + Number(p.monto));
    }
  }

  const filas = new Map<string, FilaConciliacion>();
  const fila = (id: string) => {
    let f = filas.get(id);
    if (!f) { f = { cliente_id: id, saldoAlex: 0, deudaSistema: 0, diferencia: 0, pedidos: 0 }; filas.set(id, f); }
    return f;
  };

  for (const s of saldosAlex) fila(s.cliente_id).saldoAlex += Number(s.monto);

  for (const o of pedidos) {
    if (o.fecha > corte) continue;
    const todos = pagosPorPedido.get(o.id) ?? [];
    const hastaCorte = todos.filter((p) => p.fecha <= corte);
    // El "sin factura" es una propiedad del pedido (cualquier cobro lo marca), no de la fecha del cobro.
    const debido = montoDebido(Number(o.total), todos);
    const cobrado = hastaCorte.reduce((s, p) => s + Number(p.monto), 0);
    const f = fila(o.cliente_id);
    const saldo = debido - cobrado;
    f.deudaSistema += saldo;
    if (saldo > 0.5) f.pedidos += 1;
  }
  for (const [cliente, monto] of aCuenta) fila(cliente).deudaSistema -= monto;

  return [...filas.values()]
    .map((f) => ({
      ...f,
      saldoAlex: r2(f.saldoAlex),
      deudaSistema: r2(f.deudaSistema),
      diferencia: r2(f.saldoAlex - f.deudaSistema),
    }))
    .filter((f) => Math.abs(f.saldoAlex) > 0.5 || Math.abs(f.deudaSistema) > 0.5)
    .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia));
}
