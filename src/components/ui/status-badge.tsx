import { cn } from "@/lib/utils";
import { ORDER_STATUS_CONFIG } from "./badge";
import { PEDIDO_TONE, TONE_STYLES, type Tone } from "./tones";

/** Badge de estado del panel: 12/16, radio 6, borde del tono y punto de color. */
export function StatusBadge({ tone = "neutral", className, children }: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium leading-4 whitespace-nowrap",
        t.badge,
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
      {children}
    </span>
  );
}

/** Estado de un pedido con las etiquetas de OrderStatusBadge y los tonos del panel. */
export function PedidoStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_CONFIG[status]?.label ?? status;
  return <StatusBadge tone={PEDIDO_TONE[status] ?? "neutral"}>{label}</StatusBadge>;
}
