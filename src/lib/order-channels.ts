import type { Database } from "@/types/database";

// Canales cuyos pedidos recorren el flujo operativo completo (aprobación → producción →
// despacho → distribución → entrega). La muestra es un pedido más, sin precio.
export const CANALES_FLUJO: Database["public"]["Enums"]["order_channel"][] = ["b2b_mayorista", "muestra"];

export function esCanalFlujo(channel: string) {
  return (CANALES_FLUJO as string[]).includes(channel);
}

// Columnas extra que hay que pedir junto con el pedido para que normalizarMuestra() funcione.
export const MUESTRA_SELECT =
  "channel, muestra_destinatario, muestra_contacto, zona_pedido:delivery_zones!delivery_zone_id (name), punto:direcciones_entrega!direccion_entrega_id (alias)";

/**
 * Deja el "customer" listo para mostrar en producción y distribución, sin tocar cada render:
 * - Muestras a prospectos (sin customer_id): arma un customer con los datos del contacto.
 * - Pedidos de cliente: la zona sale del PEDIDO (no del perfil, un cliente puede tener puntos
 *   de entrega en zonas distintas) y el nombre suma la sucursal ("YPF Sartori — YPF Jauretche").
 */
export function normalizarMuestra<T extends Record<string, any>>(o: T): T {
  if (o.customer) {
    const alias: string | null = o.punto?.alias?.trim() || null;
    const nombre: string | null = o.customer.full_name ?? null;
    return {
      ...o,
      customer: {
        ...o.customer,
        full_name: alias && nombre && !nombre.includes(alias) ? `${nombre} — ${alias}` : nombre,
        zona:      o.zona_pedido ?? o.customer.zona ?? null,
      },
    };
  }
  if (o.channel !== "muestra") return o;
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
