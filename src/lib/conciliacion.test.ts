import { describe, expect, it } from "vitest";
import { conciliar, fechaCorteDeDescripcion } from "./conciliacion";

describe("fechaCorteDeDescripcion", () => {
  it("lee la fecha de la descripción de la importación", () => {
    expect(fechaCorteDeDescripcion("Saldo según planilla de cuentas corrientes al 14/10/2026")).toBe("2026-10-14");
    expect(fechaCorteDeDescripcion("al 5/1/2026")).toBe("2026-01-05");
  });
  it("devuelve null si no hay fecha", () => {
    expect(fechaCorteDeDescripcion("sin fecha")).toBeNull();
    expect(fechaCorteDeDescripcion(null)).toBeNull();
  });
});

describe("conciliar", () => {
  const corte = "2026-10-14";

  it("compara el saldo de Alex con pedidos menos cobros hasta el corte", () => {
    const filas = conciliar({
      corte,
      saldosAlex: [{ cliente_id: "A", monto: 400 }],
      pedidos: [{ id: "p1", cliente_id: "A", total: 1000, fecha: "2026-10-01" }],
      pagos: [{ order_id: "p1", cliente_id: "A", monto: 600, fecha: "2026-10-05" }],
    });
    expect(filas).toEqual([{ cliente_id: "A", saldoAlex: 400, deudaSistema: 400, diferencia: 0, pedidos: 1 }]);
  });

  it("ignora pedidos y cobros posteriores al corte", () => {
    const filas = conciliar({
      corte,
      saldosAlex: [{ cliente_id: "A", monto: 1000 }],
      pedidos: [
        { id: "p1", cliente_id: "A", total: 1000, fecha: "2026-10-01" },
        { id: "p2", cliente_id: "A", total: 500, fecha: "2026-10-20" },
      ],
      pagos: [{ order_id: "p1", cliente_id: "A", monto: 1000, fecha: "2026-10-20" }],
    });
    expect(filas[0].deudaSistema).toBe(1000);
    expect(filas[0].diferencia).toBe(0);
  });

  it("sin factura: se debe el neto de IVA", () => {
    const filas = conciliar({
      corte,
      saldosAlex: [],
      pedidos: [{ id: "p1", cliente_id: "A", total: 1210, fecha: "2026-10-01" }],
      pagos: [{ order_id: "p1", cliente_id: "A", monto: 1000, fecha: "2026-10-05", sin_factura: true }],
    });
    expect(filas).toEqual([]); // 1210/1.21 = 1000 cobrado: sin deuda y sin saldo de Alex
  });

  it("un cliente que la planilla no tiene aparece con saldo de Alex en 0", () => {
    const filas = conciliar({
      corte,
      saldosAlex: [],
      pedidos: [{ id: "p1", cliente_id: "B", total: 800, fecha: "2026-09-01" }],
      pagos: [],
    });
    expect(filas).toEqual([{ cliente_id: "B", saldoAlex: 0, deudaSistema: 800, diferencia: -800, pedidos: 1 }]);
  });

  it("los cobros a cuenta (sin pedido) bajan la deuda", () => {
    const filas = conciliar({
      corte,
      saldosAlex: [{ cliente_id: "A", monto: 700 }],
      pedidos: [{ id: "p1", cliente_id: "A", total: 1000, fecha: "2026-10-01" }],
      pagos: [{ order_id: null, cliente_id: "A", monto: 300, fecha: "2026-10-10" }],
    });
    expect(filas[0].deudaSistema).toBe(700);
  });

  it("ordena por la mayor diferencia en valor absoluto", () => {
    const filas = conciliar({
      corte,
      saldosAlex: [{ cliente_id: "A", monto: 100 }, { cliente_id: "B", monto: 100 }],
      pedidos: [
        { id: "p1", cliente_id: "A", total: 150, fecha: "2026-10-01" },
        { id: "p2", cliente_id: "B", total: 900, fecha: "2026-10-01" },
      ],
      pagos: [],
    });
    expect(filas.map((f) => f.cliente_id)).toEqual(["B", "A"]);
  });
});
