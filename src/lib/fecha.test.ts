import { describe, expect, it } from "vitest";
import { anioValido, mesAR, mesValido, rangoAnioAR } from "./fecha";

describe("mesValido", () => {
  it("acepta YYYY-MM con mes 01–12", () => {
    for (const m of ["2026-01", "2026-09", "2026-12", "1999-06"]) expect(mesValido(m)).toBe(m);
  });

  it("rechaza lo que rompía las pantallas (error 500)", () => {
    for (const m of ["abc", "2026-13", "2026-00", "2026-9", "2026-09-01", "26-09", "", " 2026-09", "2026-09 "]) {
      expect(mesValido(m)).toBeNull();
    }
  });

  it("null y undefined dan null (sin parámetro en la URL)", () => {
    expect(mesValido(null)).toBeNull();
    expect(mesValido(undefined)).toBeNull();
  });
});

describe("anioValido", () => {
  it("acepta 4 dígitos y devuelve número", () => {
    expect(anioValido("2026")).toBe(2026);
  });

  it("rechaza todo lo demás", () => {
    for (const a of ["abc", "26", "20266", "2026-01", "", "-2026", "20 26"]) expect(anioValido(a)).toBeNull();
    expect(anioValido(null)).toBeNull();
    expect(anioValido(undefined)).toBeNull();
  });
});

describe("mesAR", () => {
  it("usa la hora de Argentina, no UTC", () => {
    // 1/10 00:30 UTC = 30/9 21:30 en AR → todavía es septiembre.
    expect(mesAR("2026-10-01T00:30:00Z")).toBe("2026-09");
    // 1/10 03:00 UTC = 1/10 00:00 en AR → ya es octubre.
    expect(mesAR("2026-10-01T03:00:00Z")).toBe("2026-10");
  });

  it("acepta Date y strings ISO con offset", () => {
    expect(mesAR(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01");
    expect(mesAR("2026-12-31T23:30:00-03:00")).toBe("2026-12");
  });
});

describe("rangoAnioAR", () => {
  it("cubre el año calendario completo en hora Argentina", () => {
    const { desde, hasta } = rangoAnioAR(2026);
    expect(new Date(desde).toISOString()).toBe("2026-01-01T03:00:00.000Z");
    expect(new Date(hasta).toISOString()).toBe("2027-01-01T02:59:59.999Z");
  });
});
