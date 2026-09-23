import { describe, expect, it } from "vitest";
import { calcularEntregaParcial, esMotivoFaltante } from "./entrega-parcial";

const lineas = [
  { id: "l1", product_id: "a", quantity: 10, unit_price: 1000, product_snapshot: { name: "A" } },
  { id: "l2", product_id: "b", quantity: 4,  unit_price: 2500.5, product_snapshot: { name: "B" } },
];
const base = { lineas, descuento: 0, flete: 0, cargoAdicional: 0 };

describe("calcularEntregaParcial", () => {
  it("recalcula subtotal y total con lo entregado", () => {
    const r = calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: 5 }, { lineId: "l2", entregado: 4 }] });
    expect(r.lineas.map((l) => l.lineTotal)).toEqual([5000, 10002]);
    expect(r.subtotal).toBe(15002);
    expect(r.total).toBe(15002);
    expect(r.todoEntregado).toBe(false);
    expect(r.nadaEntregado).toBe(false);
  });

  it("una línea que no viene en la entrega se toma como entregada completa", () => {
    const r = calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: 0 }] });
    expect(r.lineas[1].entregado).toBe(4);
    expect(r.total).toBe(10002);
  });

  it("el cargo adicional y el flete se mantienen; el descuento se conserva con tope en el subtotal", () => {
    const r = calcularEntregaParcial({
      lineas, entregas: [{ lineId: "l1", entregado: 1 }, { lineId: "l2", entregado: 0 }],
      descuento: 5000, flete: 300, cargoAdicional: 200,
    });
    expect(r.subtotal).toBe(1000);
    expect(r.descuento).toBe(1000);
    expect(r.total).toBe(500);
  });

  it("detecta entrega completa y entrega vacía", () => {
    expect(calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: 10 }, { lineId: "l2", entregado: 4 }] }).todoEntregado).toBe(true);
    expect(calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: 0 }, { lineId: "l2", entregado: 0 }] }).nadaEntregado).toBe(true);
  });

  it("rechaza más de lo pedido, negativos, decimales, NaN, líneas ajenas y repetidas", () => {
    expect(() => calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: 11 }] })).toThrow(/más de lo pedido/);
    expect(() => calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: -1 }] })).toThrow();
    expect(() => calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: NaN }] })).toThrow();
    expect(() => calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: 1.5 }] })).toThrow(/enteros/);
    expect(() => calcularEntregaParcial({ ...base, entregas: [{ lineId: "x", entregado: 1 }] })).toThrow(/no pertenece/);
    expect(() => calcularEntregaParcial({ ...base, entregas: [{ lineId: "l1", entregado: 1 }, { lineId: "l1", entregado: 2 }] })).toThrow(/repetida/);
  });

  it("dos líneas del mismo producto no se pisan", () => {
    const dup = [
      { id: "x1", product_id: "a", quantity: 2, unit_price: 100 },
      { id: "x2", product_id: "a", quantity: 3, unit_price: 100 },
    ];
    const r = calcularEntregaParcial({ lineas: dup, entregas: [{ lineId: "x1", entregado: 1 }], descuento: 0, flete: 0, cargoAdicional: 0 });
    expect(r.total).toBe(400);
  });
});

describe("esMotivoFaltante", () => {
  it("acepta solo los motivos definidos", () => {
    expect(esMotivoFaltante("sin_stock")).toBe(true);
    expect(esMotivoFaltante("inventado")).toBe(false);
    expect(esMotivoFaltante(undefined)).toBe(false);
  });
});
