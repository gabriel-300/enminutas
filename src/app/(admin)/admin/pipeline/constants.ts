// Los tonos de cada estado viven en components/ui/tones.ts (PIPELINE_TONE) — única fuente.
export const ESTADOS = [
  { key: "nuevo",             label: "Nuevo" },
  { key: "contactado",        label: "Contactado" },
  { key: "interesado",        label: "Interesado" },
  { key: "propuesta_enviada", label: "Propuesta enviada" },
  { key: "ganado",            label: "Ganado" },
  { key: "perdido",           label: "Perdido" },
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
