import type { Database } from "@/types/database";

// Canales cuyos pedidos recorren el flujo operativo completo (aprobación → producción →
// despacho → distribución → entrega). La muestra es un pedido más, sin precio.
export const CANALES_FLUJO: Database["public"]["Enums"]["order_channel"][] = ["b2b_mayorista", "muestra"];

export function esCanalFlujo(channel: string) {
  return (CANALES_FLUJO as string[]).includes(channel);
}

// Columnas extra que hay que pedir junto con el pedido para que normalizarMuestra() funcione.
export const MUESTRA_SELECT =
  "channel, muestra_destinatario, muestra_contacto, zona_pedido:delivery_zones!delivery_zone_id (name)";

/**
 * Las muestras a prospectos no tienen customer_id. Arma un "customer" con los datos del contacto
 * para que las pantallas de producción y distribución lo muestren igual que a un cliente
 * (nombre, teléfono y zona), sin tocar cada render.
 */
export function normalizarMuestra<T extends Record<string, any>>(o: T): T {
  if (o.channel !== "muestra" || o.customer) return o;
  const nombre = o.muestra_destinatario?.trim() || "Muestra";
  const contacto = o.muestra_contacto?.trim();
  return {
    ...o,
    customer: {
      full_name: contacto ? `${nombre} — ${contacto}` : nombre,
      phone:     o.guest_phone ?? null,
      zona:      o.zona_pedido ?? null,
    },
  };
}
