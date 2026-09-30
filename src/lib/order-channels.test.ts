import { describe, it, expect } from "vitest";
import { normalizarMuestra } from "./order-channels";

describe("normalizarMuestra", () => {
  it("pedido de cliente: la zona sale del pedido, no del perfil", () => {
    const o = normalizarMuestra({
      channel: "b2b_mayorista",
      customer: { full_name: "YPF Sartori", zona: { name: "Zona Perfil" } },
      zona_pedido: { name: "Garupá" },
      punto: null,
    });
    expect(o.customer.zona).toEqual({ name: "Garupá" });
  });

  it("pedido de cliente sin zona en el pedido: cae a la del perfil", () => {
    const o = normalizarMuestra({
      channel: "b2b_mayorista",
      customer: { full_name: "Cliente", zona: { name: "Zona Perfil" } },
      zona_pedido: null,
    });
    expect(o.customer.zona).toEqual({ name: "Zona Perfil" });
  });

  it("suma la sucursal al nombre del cliente", () => {
    const o = normalizarMuestra({
      channel: "b2b_mayorista",
      customer: { full_name: "YPF Sartori", zona: null },
      punto: { alias: "YPF Jauretche" },
    });
    expect(o.customer.full_name).toBe("YPF Sartori — YPF Jauretche");
  });

  it("no duplica la sucursal si el nombre ya la incluye", () => {
    const o = normalizarMuestra({
      channel: "b2b_mayorista",
      customer: { full_name: "Petri — Suc. 213", zona: null },
      punto: { alias: "Suc. 213" },
    });
    expect(o.customer.full_name).toBe("Petri — Suc. 213");
  });

  it("muestra a prospecto (sin customer) arma el customer con el contacto", () => {
    const o = normalizarMuestra<Record<string, any>>({
      channel: "muestra",
      muestra_destinatario: "Café Sol",
      muestra_contacto: "Ana",
      guest_phone: "3764000000",
      zona_pedido: { name: "Posadas" },
    });
    expect(o.customer.full_name).toBe("Café Sol — Ana");
    expect(o.customer.zona).toEqual({ name: "Posadas" });
  });
});
