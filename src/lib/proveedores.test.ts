import { describe, expect, it } from "vitest";
import { claveProveedor, esCategoriaGasto, estadoVencimiento, etiquetaComprobante, fechaValida, imputarPago, normalizarCuit, parseMontoAR, sumarDias } from "./proveedores";

describe("imputarPago", () => {
  const pend = [
    { id: "a", saldo: 100 },
    { id: "b", saldo: 50 },
  ];

  it("paga la primera y parte de la segunda", () => {
    const r = imputarPago(120, pend);
    expect(r.imputaciones).toEqual([
      { recepcionId: "a", monto: 100 },
      { recepcionId: "b", monto: 20 },
    ]);
    expect(r.aCuenta).toBe(0);
  });

  it("lo que sobra queda a cuenta", () => {
    const r = imputarPago(200, pend);
    expect(r.imputaciones.map(i => i.monto)).toEqual([100, 50]);
    expect(r.aCuenta).toBe(50);
  });

  it("sin facturas todo va a cuenta", () => {
    expect(imputarPago(80, [])).toEqual({ imputaciones: [], aCuenta: 80 });
  });

  it("ignora facturas sin saldo y no pierde centavos", () => {
    const r = imputarPago(10.1, [{ id: "x", saldo: 0 }, { id: "y", saldo: 3.3 }, { id: "z", saldo: 100 }]);
    expect(r.imputaciones).toEqual([
      { recepcionId: "y", monto: 3.3 },
      { recepcionId: "z", monto: 6.8 },
    ]);
    expect(r.aCuenta).toBe(0);
  });
});

describe("fechas de vencimiento", () => {
  it("suma días cruzando mes y año", () => {
    expect(sumarDias("2026-10-25", 30)).toBe("2026-11-24");
    expect(sumarDias("2026-12-20", 15)).toBe("2027-01-04");
    expect(sumarDias("2026-11-02", 0)).toBe("2026-11-02");
  });

  it("clasifica vencida / por vencer / al día", () => {
    expect(estadoVencimiento("2026-11-01", "2026-11-02")).toBe("vencida");
    expect(estadoVencimiento("2026-11-02", "2026-11-02")).toBe("por_vencer");
    expect(estadoVencimiento("2026-11-09", "2026-11-02")).toBe("por_vencer");
    expect(estadoVencimiento("2026-11-10", "2026-11-02")).toBe("al_dia");
  });
});

describe("unificación de proveedores", () => {
  it("ignora mayúsculas, acentos, signos y sufijo societario", () => {
    expect(claveProveedor("El Abasto")).toBe(claveProveedor("el Abasto srl"));
    expect(claveProveedor("SAN GABRIEL S.R.L.")).toBe(claveProveedor("SAN GABRIELS.R.L"));
    expect(claveProveedor("Cañuelas")).toBe("canuelas");
  });

  it("normaliza el CUIT con o sin guiones", () => {
    expect(normalizarCuit("30555181619")).toBe("30-55518161-9");
    expect(normalizarCuit("30-55518161-9")).toBe("30-55518161-9");
    expect(normalizarCuit("")).toBeNull();
    expect(normalizarCuit(null)).toBeNull();
  });
});

describe("gastos", () => {
  it("nombra los comprobantes", () => {
    expect(etiquetaComprobante("factura")).toBe("Factura");
    expect(etiquetaComprobante("remito", "luz")).toBe("Remito");
    expect(etiquetaComprobante("gasto", "luz")).toBe("Gasto (Luz)");
    expect(etiquetaComprobante("gasto", null)).toBe("Gasto");
  });

  it("valida la categoría", () => {
    expect(esCategoriaGasto("alquiler")).toBe(true);
    expect(esCategoriaGasto("combustible")).toBe(false);
  });
});

describe("parseMontoAR", () => {
  it("formato argentino con miles y decimales", () => {
    expect(parseMontoAR("1.500,50")).toBe(1500.5);
    expect(parseMontoAR("1.234.567,89")).toBe(1234567.89);
    expect(parseMontoAR("$ 12.000")).toBe(12000);
  });

  it("decimal con coma o con punto", () => {
    expect(parseMontoAR("1234,5")).toBe(1234.5);
    expect(parseMontoAR("1234.56")).toBe(1234.56);
    expect(parseMontoAR("0,5")).toBe(0.5);
    expect(parseMontoAR("2.5")).toBe(2.5);
  });

  it("miles sin decimales", () => {
    expect(parseMontoAR("1.500")).toBe(1500);
    expect(parseMontoAR("1.500.000")).toBe(1500000);
    expect(parseMontoAR("1500")).toBe(1500);
  });

  it("formato estadounidense", () => {
    expect(parseMontoAR("1,234.56")).toBe(1234.56);
    expect(parseMontoAR("1,500,000")).toBe(1500000);
  });

  it("rechaza lo que no es un importe", () => {
    expect(parseMontoAR("")).toBeNull();
    expect(parseMontoAR("abc")).toBeNull();
    expect(parseMontoAR("12a")).toBeNull();
    expect(parseMontoAR("1,2,3")).toBeNull();
    expect(parseMontoAR("1..5")).toBeNull();
    expect(parseMontoAR("--5")).toBeNull();
    expect(parseMontoAR(null)).toBeNull();
    expect(parseMontoAR(undefined)).toBeNull();
    expect(parseMontoAR(NaN)).toBeNull();
  });

  it("el bug que evita: parseFloat('1.500,50') da 1.5", () => {
    expect(parseFloat("1.500,50".replace(",", "."))).toBe(1.5);
    expect(parseMontoAR("1.500,50")).toBe(1500.5);
  });

  it("acepta números y negativos explícitos", () => {
    expect(parseMontoAR(250)).toBe(250);
    expect(parseMontoAR("-100")).toBe(-100);
  });
});

describe("fechaValida", () => {
  it("acepta fechas reales", () => {
    expect(fechaValida("2026-11-02")).toBe(true);
    expect(fechaValida("2028-02-29")).toBe(true);
  });
  it("rechaza fechas imposibles o mal formadas", () => {
    expect(fechaValida("2026-13-45")).toBe(false);
    expect(fechaValida("2026-02-30")).toBe(false);
    expect(fechaValida("2027-02-29")).toBe(false);
    expect(fechaValida("02/11/2026")).toBe(false);
    expect(fechaValida("")).toBe(false);
    expect(fechaValida(null)).toBe(false);
  });
});
