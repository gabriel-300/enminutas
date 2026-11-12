import { describe, expect, it } from "vitest";
import { cobradoDeMas, saldoPedido, tieneSaldo } from "./cobranza";

describe("saldoPedido", () => {
  it("sin cobros, el saldo es el total", () => {
    expect(saldoPedido(1000, [])).toBe(1000);
  });

  it("cobro parcial deja saldo", () => {
    expect(saldoPedido(1000, [{ monto: 400 }])).toBe(600);
    expect(tieneSaldo(1000, [{ monto: 400 }])).toBe(true);
  });

  it("cobro completo no deja saldo", () => {
    expect(tieneSaldo(1000, [{ monto: "600" }, { monto: 400 }])).toBe(false);
  });

  it("sin factura se cobra neto de IVA: el IVA no es saldo", () => {
    const neto = Math.round(1210 / 1.21);
    expect(tieneSaldo(1210, [{ monto: neto, sin_factura: true }])).toBe(false);
  });

  it("sin factura con cobro parcial sigue con saldo", () => {
    expect(tieneSaldo(1210, [{ monto: 500, sin_factura: true }])).toBe(true);
  });

  it("tolera un peso de redondeo", () => {
    expect(tieneSaldo(1000, [{ monto: 999.5 }])).toBe(false);
  });
});

describe("cobradoDeMas", () => {
  it("devuelve el exceso cuando hay cobros duplicados", () => {
    expect(cobradoDeMas(1000, [{ monto: 1000 }, { monto: 1000 }])).toBe(1000);
  });
  it("es 0 si está cobrado justo o con saldo", () => {
    expect(cobradoDeMas(1000, [{ monto: 1000 }])).toBe(0);
    expect(cobradoDeMas(1000, [{ monto: 400 }])).toBe(0);
  });
  it("ignora diferencias de redondeo", () => {
    expect(cobradoDeMas(1000, [{ monto: 1000.5 }])).toBe(0);
  });
  it("sin factura compara contra el neto de IVA", () => {
    expect(cobradoDeMas(1210, [{ monto: 1210, sin_factura: true }])).toBe(210);
  });
});
