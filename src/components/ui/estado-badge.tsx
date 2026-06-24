const CONFIG: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "Pend. de pago",  className: "bg-yellow-100 text-yellow-800 ring-yellow-200" },
  aprobado:        { label: "Aprobado",        className: "bg-blue-100 text-blue-800 ring-blue-200" },
  enviado_prod:    { label: "En producción",   className: "bg-purple-100 text-purple-800 ring-purple-200" },
  despachado:      { label: "Despachado",      className: "bg-orange-100 text-orange-800 ring-orange-200" },
  en_distribucion: { label: "En distribución", className: "bg-sky-100 text-sky-800 ring-sky-200" },
  delivered:       { label: "Entregado",       className: "bg-green-100 text-green-800 ring-green-200" },
  entrega_parcial: { label: "Entrega parcial", className: "bg-amber-100 text-amber-800 ring-amber-200" },
  liquidado:       { label: "Liquidado",       className: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
  cancelled:       { label: "Cancelado",       className: "bg-red-100 text-red-700 ring-red-200" },
};

export function EstadoBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { label: status, className: "bg-neutral-100 text-neutral-600 ring-neutral-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cfg.className}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
}
