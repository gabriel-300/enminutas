import { describe, expect, it } from "vitest";
import { Constants } from "@/types/database";
import { VENTAS_STATUSES } from "./order-status";

describe("VENTAS_STATUSES", () => {
  it("todos son valores reales del enum order_status de la base", () => {
    const enumReal = Constants.public.Enums.order_status as readonly string[];
    for (const s of VENTAS_STATUSES) expect(enumReal).toContain(s);
  });

  it("incluye los estados intermedios que dejaban comisiones y reportes incompletos", () => {
    expect(VENTAS_STATUSES).toContain("entrega_parcial");
    expect(VENTAS_STATUSES).toContain("en_distribucion");
  });

  it("no cuenta pedidos sin aprobar, cancelados ni reembolsados", () => {
    for (const s of ["pending_payment", "payment_review", "cancelled", "refunded"]) {
      expect(VENTAS_STATUSES).not.toContain(s);
    }
  });

  it("no tiene duplicados", () => {
    expect(new Set(VENTAS_STATUSES).size).toBe(VENTAS_STATUSES.length);
  });
});
