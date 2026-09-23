import { describe, expect, it } from "vitest";
import { calcularComisionOrden } from "./comisiones";

const IVA = 0.21;

describe("calcularComisionOrden", () => {
  it("el pool es base × pool / (1 + IVA + pool)", () => {
    // 1.000.000 c/IVA, pool 15%: 1.000.000 × 0,15 / 1,36 = 110.294,12
    const c = calcularComisionOrden({ base: 1_000_000, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0 });
    expect(c.total).toBeCloseTo(110_294.1176, 3);
  });

  it("reproduce el pool de los pedidos en entrega_parcial de septiembre 2026 (medido en la base)", () => {
    // Pedido de julio: $493.328 con pool 15% → $54.411 (redondeado), como dio la consulta SQL.
    const c = calcularComisionOrden({ base: 493_328, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0 });
    expect(Math.round(c.total)).toBe(54_411);
  });

  it("sin preventista, la comercializadora se queda con todo el pool", () => {
    const c = calcularComisionOrden({ base: 1_000_000, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0 });
    expect(c.preventista).toBe(0);
    expect(c.preventistaPct).toBe(0);
    expect(c.comercializadora).toBeCloseTo(c.total, 6);
    expect(c.comercializadoraPct).toBeCloseTo(0.15, 10);
  });

  it("el preventista cobra su %, la comercializadora el resto, y suman el pool", () => {
    const c = calcularComisionOrden({ base: 1_000_000, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0.05 });
    expect(c.preventista).toBeCloseTo((1_000_000 * 0.05) / 1.36, 6);
    expect(c.preventistaPct).toBe(0.05);
    expect(c.comercializadoraPct).toBeCloseTo(0.10, 10);
    expect(c.preventista + c.comercializadora).toBeCloseTo(c.total, 6);
  });

  it("el % del preventista nunca supera el pool del cliente", () => {
    // Cliente con pool 10% y preventista con 15% configurado: cobra 10%, la comercializadora 0.
    const c = calcularComisionOrden({ base: 1_000_000, ivaPct: IVA, poolPct: 0.10, preventistaPct: 0.15 });
    expect(c.preventistaPct).toBe(0.10);
    expect(c.preventista).toBeCloseTo(c.total, 6);
    expect(c.comercializadora).toBeCloseTo(0, 6);
    expect(c.comercializadoraPct).toBe(0);
  });

  it("un cliente con override 0 no genera comisión para nadie", () => {
    const c = calcularComisionOrden({ base: 1_000_000, ivaPct: IVA, poolPct: 0, preventistaPct: 0.05 });
    expect(c).toEqual({ total: 0, preventista: 0, preventistaPct: 0, comercializadora: 0, comercializadoraPct: 0 });
  });

  it("un pedido cobrado sin factura comisiona sobre lo cobrado, no sobre el total", () => {
    const conFactura = calcularComisionOrden({ base: 1_000_000, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0.05 });
    const sinFactura = calcularComisionOrden({ base: 826_446, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0.05 }); // 1.000.000 / 1,21
    expect(sinFactura.total).toBeLessThan(conFactura.total);
    expect(sinFactura.total / conFactura.total).toBeCloseTo(826_446 / 1_000_000, 6);
  });

  it("base 0 da comisión 0", () => {
    const c = calcularComisionOrden({ base: 0, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0.05 });
    expect(c.total).toBe(0);
    expect(c.preventista).toBe(0);
    expect(c.comercializadora).toBe(0);
  });
});
