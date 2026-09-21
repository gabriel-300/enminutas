import type { Database } from "@/types/database";

// order_status es un ENUM de PostgreSQL: un estado nuevo requiere ALTER TYPE (ver supabase/README.md).
export type OrderStatus = Database["public"]["Enums"]["order_status"];

// Estados que cuentan como venta en el dashboard y en reportes. Ojo: comisiones, preventista y
// objetivos usan listas propias y distintas (ver hallazgos de la auditoría 2026-09-21).
export const VENTAS_STATUSES: OrderStatus[] = [
  "aprobado", "enviado_prod", "despachado", "en_distribucion",
  "entrega_parcial", "delivered", "liquidado",
];
