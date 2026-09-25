import { describe, it, expect } from "vitest";
import { repartirLotes } from "./produccion-reparto";

describe("repartirLotes", () => {
  it("una sola presentación recibe todos los lotes", () => {
    expect(repartirLotes(2.5, [30])).toEqual([2.5]);
  });

  it("reparte en proporción a los kg", () => {
    // 1 lote: 20 kg en bolsas + 10 kg en cajas → 2/3 y 1/3
    const r = repartirLotes(1, [20, 10]);
    expect(r[0]).toBeCloseTo(0.667, 3);
    expect(r[1]).toBeCloseTo(0.333, 3);
  });

  it("la suma es exactamente la cantidad de lotes aunque haya redondeo", () => {
    const partes = repartirLotes(1, [1, 1, 1]);
    expect(partes.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
    const otras = repartirLotes(3.7, [13.2, 5.6, 7.1, 2.9]);
    expect(otras.reduce((s, x) => s + x, 0)).toBeCloseTo(3.7, 10);
  });

  it("falla si no hay kg asignados", () => {
    expect(() => repartirLotes(1, [0, 0])).toThrow();
  });

  it("lista vacía", () => {
    expect(repartirLotes(1, [])).toEqual([]);
  });
});
