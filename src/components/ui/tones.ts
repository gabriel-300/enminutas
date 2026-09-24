/** Tonos semánticos del panel (tema Índigo). El color nunca es la única señal: siempre va con texto. */
export type Tone = "neutral" | "info" | "brand" | "success" | "warning" | "danger";

// Clases literales (no armadas por template) para que Tailwind las detecte.
export const TONE_STYLES: Record<Tone, {
  /** Badge: fondo + borde + texto */
  badge: string;
  /** Punto de 6px */
  dot: string;
  /** Tile de ícono: fondo + color del ícono */
  tile: string;
  /** Solo el color de texto del tono */
  text: string;
  /** Solo el borde del tono */
  border: string;
}> = {
  neutral: { badge: "bg-n-100 border-n-tag text-n-700",                 dot: "bg-n-500",         tile: "bg-n-100 text-n-700",         text: "text-n-700",     border: "border-n-tag" },
  info:    { badge: "bg-info-bg border-info-border text-info",          dot: "bg-info-solid",    tile: "bg-info-bg text-info",        text: "text-info",      border: "border-info-border" },
  brand:   { badge: "bg-brand-50 border-brand-200 text-brand-700",      dot: "bg-brand-600",     tile: "bg-brand-50 text-brand-700",  text: "text-brand-700", border: "border-brand-200" },
  success: { badge: "bg-success-bg border-success-border text-success", dot: "bg-success-solid", tile: "bg-success-bg text-success",  text: "text-success",   border: "border-success-border" },
  warning: { badge: "bg-warning-bg border-warning-border text-warning", dot: "bg-warning-solid", tile: "bg-warning-bg text-warning",  text: "text-warning",   border: "border-warning-border" },
  danger:  { badge: "bg-danger-bg border-danger-border text-danger",    dot: "bg-danger-solid",  tile: "bg-danger-bg text-danger",    text: "text-danger",    border: "border-danger-border" },
};

// Estado → tono, un objeto por dominio. Las claves son los valores reales de la base.
export const PEDIDO_TONE: Record<string, Tone> = {
  pending_payment: "neutral",
  payment_review:  "info",
  paid:            "success",
  preparing:       "brand",
  ready:           "success",
  in_delivery:     "brand",
  shipped:         "brand",
  delivered:       "success",
  cancelled:       "danger",
  refunded:        "neutral",
  aprobado:        "info",
  enviado_prod:    "brand",
  despachado:      "brand",
  en_distribucion: "brand",
  entrega_parcial: "warning",
  liquidado:       "success",
};

export const PIPELINE_TONE = {
  nuevo: "neutral", contactado: "info", interesado: "brand", propuesta_enviada: "warning", ganado: "success", perdido: "danger",
} as const satisfies Record<string, Tone>;
export const ALERTA_TONE = { critico: "danger", urgente: "warning", info: "info" } as const satisfies Record<string, Tone>;
export const CLIENTE_TONE = { activo: "success", inactivo: "neutral" } as const satisfies Record<string, Tone>;
