import { fmt } from "@/lib/format";

export const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "en_distribucion", "entrega_parcial", "delivered", "liquidado"];

export const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return fmt(n);
};

export function pctChange(current: number, prev: number) {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}
