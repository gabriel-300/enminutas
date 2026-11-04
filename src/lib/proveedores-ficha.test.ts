import { describe, expect, it } from "vitest";
import { esCondicionIva, normalizarCbu, validarDesglose } from "./proveedores-ficha";

describe("ficha y desglose de proveedores", () => {
  it("normaliza el CBU (22 digitos, tolera espacios y guiones)", () => {
    expect(normalizarCbu("")).toBeNull();
    expect(normalizarCbu("0170 0990-4000 0000 1234 56")).toBe("0170099040000000123456");
    expect(normalizarCbu("123")).toBe("invalido");
  });

  it("valida que neto, IVA y percepciones sumen el total", () => {
    expect(validarDesglose({}, 1210)).toBeNull();
    expect(validarDesglose({ neto: 1000, iva: 210 }, 1210)).toBeNull();
    expect(validarDesglose({ neto: 1000, iva: 210, percepciones: 30 }, 1210)).toMatch(/no suman/);
  });

  it("reconoce condiciones de IVA validas", () => {
    expect(esCondicionIva("monotributo")).toBe(true);
    expect(esCondicionIva("otra")).toBe(false);
  });
});
