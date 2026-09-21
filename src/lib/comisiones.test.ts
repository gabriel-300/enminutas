import { describe, expect, it } from "vitest";
import { calcularComisionOrden, proporcionEntregada } from "./comisiones";

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

describe("proporcionEntregada", () => {
  const lineas = [
    { product_id: "a", line_total: 60_000 },
    { product_id: "b", line_total: 40_000 },
  ];

  it("sin snapshot (entrega total) es 1", () => {
    expect(proporcionEntregada(lineas, null)).toBe(1);
    expect(proporcionEntregada(lineas, [])).toBe(1);
  });

  it("pondera por el valor de cada línea, no por unidades", () => {
    // Del producto a (60k) se entrega la mitad; b (40k) completo → 70k de 100k.
    const snapshot = [
      { productId: "a", pedido: 10, entregado: 5 },
      { productId: "b", pedido: 4,  entregado: 4 },
    ];
    expect(proporcionEntregada(lineas, snapshot)).toBeCloseTo(0.7, 10);
  });

  it("una línea que no figura en el snapshot cuenta como entregada completa", () => {
    const snapshot = [{ productId: "a", pedido: 10, entregado: 0 }];
    expect(proporcionEntregada(lineas, snapshot)).toBeCloseTo(0.4, 10);
  });

  it("no pasa de 1 aunque se registre más de lo pedido", () => {
    const snapshot = [{ productId: "a", pedido: 10, entregado: 15 }];
    expect(proporcionEntregada(lineas, snapshot)).toBe(1);
  });

  it("nada entregado es 0", () => {
    const snapshot = [
      { productId: "a", pedido: 10, entregado: 0 },
      { productId: "b", pedido: 4,  entregado: 0 },
    ];
    expect(proporcionEntregada(lineas, snapshot)).toBe(0);
  });

  it("sin líneas devuelve 1 en vez de dividir por cero", () => {
    expect(proporcionEntregada([], [{ productId: "a", pedido: 1, entregado: 0 }])).toBe(1);
  });

  it("la comisión de un parcial baja en la misma proporción", () => {
    const total = 493_328;
    const entregado = total * proporcionEntregada(lineas, [{ productId: "a", pedido: 10, entregado: 5 }, { productId: "b", pedido: 4, entregado: 4 }]);
    const completo = calcularComisionOrden({ base: total, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0 });
    const parcial  = calcularComisionOrden({ base: entregado, ivaPct: IVA, poolPct: 0.15, preventistaPct: 0 });
    expect(parcial.total / completo.total).toBeCloseTo(0.7, 10);
  });
});
