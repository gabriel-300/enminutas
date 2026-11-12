import { describe, expect, it } from "vitest";
import { compararRemitosConFactura } from "./remitos";

describe("compararRemitosConFactura", () => {
  it("compara contra el neto de la factura", () => {
    expect(compararRemitosConFactura([100, 200], { neto: 300, total: 363 })).toEqual({ suma: 300, base: 300, diferencia: 0 });
  });

  it("sin neto compara contra el total", () => {
    expect(compararRemitosConFactura([100], { neto: null, total: 150 })).toEqual({ suma: 100, base: 150, diferencia: 50 });
  });

  it("una diferencia negativa indica que los remitos suman más que la factura", () => {
    expect(compararRemitosConFactura([400], { neto: 300, total: 363 }).diferencia).toBe(-100);
  });

  it("redondea a centavos", () => {
    expect(compararRemitosConFactura([0.1, 0.2], { neto: 0.3, total: 0.3 }).diferencia).toBe(0);
  });
});
