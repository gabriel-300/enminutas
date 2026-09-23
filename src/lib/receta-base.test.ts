import { describe, it, expect } from "vitest";
import { factorABase, cajasPorLote, kgPorLote, resolverRecetas } from "./receta-base";

describe("factorABase / cajasPorLote", () => {
  it("convierte por peso: caja de 5,6 kg contra base de 10,2 kg", () => {
    const f = factorABase(5.6, 10.2)!;
    expect(f).toBeCloseTo(0.549, 3);
    // 1 lote = 6,2 cajas de 10,2 kg = 63,24 kg = 11,29 cajas de 5,6 kg
    expect(cajasPorLote(6.2, f)).toBeCloseTo(11.293, 2);
  });

  it("la presentación base rinde exactamente el yield de la receta", () => {
    expect(cajasPorLote(6.2, factorABase(10.2, 10.2))).toBeCloseTo(6.2, 10);
  });

  it("acepta strings numéricos (numeric de Postgres) y devuelve null si falta kg_caja", () => {
    expect(factorABase("5.600", "10.200")).toBeCloseTo(0.549, 3);
    expect(factorABase(null, 10.2)).toBeNull();
    expect(factorABase(5.6, 0)).toBeNull();
    expect(cajasPorLote(6.2, null)).toBeNull();
  });
});

describe("kgPorLote", () => {
  it("yield por kg de la caja base", () => {
    expect(kgPorLote(6.2, 10.2)).toBeCloseTo(63.24, 2);
    expect(kgPorLote(6.2, null)).toBeNull();
  });
});

describe("resolverRecetas", () => {
  const productos = [
    { id: "base",  receta_producto_id: null,   kg_caja: 10.2 },
    { id: "pres",  receta_producto_id: "base", kg_caja: 5.1 },
    { id: "sinkg", receta_producto_id: "base", kg_caja: null },
    { id: "otra",  receta_producto_id: null,   kg_caja: 8 },
    { id: "nada",  receta_producto_id: null,   kg_caja: 3 },
  ];
  const recetas = [
    { product_id: "base", yield_cajas: 6 },
    { product_id: "otra", yield_cajas: 2 },
  ];
  const r = resolverRecetas(productos, recetas);

  it("el base usa su propia receta con factor 1", () => {
    expect(r.base).toMatchObject({ baseId: "base", factor: 1 });
  });
  it("la presentación hereda la receta del base con factor por peso", () => {
    expect(r.pres.baseId).toBe("base");
    expect(r.pres.factor).toBeCloseTo(0.5, 10);
    expect(r.pres.receta.yield_cajas).toBe(6);
  });
  it("excluye presentaciones sin kg_caja y productos sin receta", () => {
    expect(r.sinkg).toBeUndefined();
    expect(r.nada).toBeUndefined();
  });
  it("una receta propia independiente sigue funcionando", () => {
    expect(r.otra).toMatchObject({ baseId: "otra", factor: 1 });
  });
});
