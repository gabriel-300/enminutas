import { describe, expect, it } from "vitest";
import { fmt, fmt2, fmtK, fmtPct } from "./format";

// Intl usa espacios no separables (U+00A0) entre el $ y el número.
const plano = (s: string) => s.replace(/\s/g, " ");

describe("fmt / fmt2", () => {
  it("fmt no muestra decimales", () => {
    expect(plano(fmt(1234))).toBe("$ 1.234");
    expect(plano(fmt(1234.56))).toBe("$ 1.235");
  });

  it("fmt2 muestra siempre 2 decimales", () => {
    expect(plano(fmt2(1234.5))).toBe("$ 1.234,50");
    expect(plano(fmt2(1234.56))).toBe("$ 1.234,56");
  });
});

describe("fmtK", () => {
  it("abrevia miles y millones", () => {
    expect(fmtK(45_000)).toBe("$45k");
    expect(fmtK(2_787_353)).toBe("$2.8M");
    expect(fmtK(1_000_000)).toBe("$1.0M");
  });

  it("por debajo de 1.000 usa el formato completo", () => {
    expect(plano(fmtK(999))).toBe("$ 999");
  });
});

describe("fmtPct", () => {
  it("no redondea un porcentaje con decimales a entero (2,5% no es 3%)", () => {
    expect(fmtPct(0.025)).toBe("2,5%");
  });

  it("muestra enteros sin decimales", () => {
    expect(fmtPct(0.15)).toBe("15%");
    expect(fmtPct(0)).toBe("0%");
  });
});
