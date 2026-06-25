export const ESTADOS = [
  { key: "nuevo",             label: "Nuevo",             color: "bg-neutral-100 text-neutral-600" },
  { key: "contactado",        label: "Contactado",        color: "bg-blue-50 text-blue-700" },
  { key: "interesado",        label: "Interesado",        color: "bg-amber-50 text-amber-700" },
  { key: "propuesta_enviada", label: "Propuesta enviada", color: "bg-purple-50 text-purple-700" },
  { key: "ganado",            label: "Ganado",            color: "bg-emerald-50 text-emerald-700" },
  { key: "perdido",           label: "Perdido",           color: "bg-red-50 text-red-600" },
] as const;

export type EstadoKey = typeof ESTADOS[number]["key"];

export const FLUJO: Record<EstadoKey, EstadoKey | null> = {
  nuevo:             "contactado",
  contactado:        "interesado",
  interesado:        "propuesta_enviada",
  propuesta_enviada: "ganado",
  ganado:            null,
  perdido:           null,
};
