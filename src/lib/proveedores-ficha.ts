// Lógica pura de la ficha del proveedor, el desglose de comprobantes y las órdenes de pago.

const redondear = (n: number) => Math.round(n * 100) / 100;

// ── Ficha del proveedor: condición de IVA y datos bancarios ──────────────────────────────────────────
export const CONDICIONES_IVA = [
  { value: "responsable_inscripto", label: "Responsable Inscripto" },
  { value: "monotributo",           label: "Monotributo" },
  { value: "exento",                label: "Exento" },
  { value: "consumidor_final",      label: "Consumidor Final" },
  { value: "no_responsable",        label: "No Responsable" },
] as const;

export function esCondicionIva(v: unknown): boolean {
  return CONDICIONES_IVA.some(c => c.value === v);
}

export function etiquetaCondicionIva(v: string | null | undefined): string {
  return CONDICIONES_IVA.find(c => c.value === v)?.label ?? "—";
}

// CBU: 22 dígitos. Tolera espacios y guiones. Vacío → null; si no cumple → "invalido".
export function normalizarCbu(raw: string | null | undefined): string | null | "invalido" {
  const limpio = (raw ?? "").replace(/[\s-]/g, "");
  if (!limpio) return null;
  return /^\d{22}$/.test(limpio) ? limpio : "invalido";
}

// ── Desglose del comprobante: neto + IVA + percepciones = total ──────────────────────────────────────
export type Desglose = { neto?: number | null; iva?: number | null; percepciones?: number | null };

// Si se informa algún componente, tienen que sumar el total (tolerancia de $1 por redondeo).
export function validarDesglose(d: Desglose, total: number): string | null {
  const informado = d.neto != null || d.iva != null || d.percepciones != null;
  if (!informado) return null;
  const suma = (d.neto ?? 0) + (d.iva ?? 0) + (d.percepciones ?? 0);
  if (Math.abs(suma - total) > 1)
    return `Neto + IVA + percepciones (${redondear(suma)}) no suman el importe total (${redondear(total)})`;
  return null;
}

// ── Orden de pago: borrador → aprobada → pagada ──────────────────────────────────────────────────────
export type EstadoOrdenPago = "borrador" | "aprobada" | "pagada";

export const ESTADO_ORDEN_PAGO: Record<EstadoOrdenPago, string> = {
  borrador: "Borrador", aprobada: "Aprobada", pagada: "Pagada",
};

// Única transición permitida desde cada estado.
export const SIGUIENTE_ESTADO: Record<EstadoOrdenPago, EstadoOrdenPago | null> = {
  borrador: "aprobada", aprobada: "pagada", pagada: null,
};
