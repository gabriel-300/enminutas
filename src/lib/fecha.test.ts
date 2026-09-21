import { describe, expect, it } from "vitest";
import { anioValido, mesValido } from "./fecha";

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
