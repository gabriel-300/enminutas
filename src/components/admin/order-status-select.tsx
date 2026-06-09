"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/(admin)/admin/pedidos/actions";

// Solo los 3 estados que updateOrderStatus permite asignar manualmente.
// Los otros (enviado_prod, despachado, etc.) se cambian desde producción/distribución.
const B2B_OPTIONS = [
  { value: "pending_payment",  label: "Pendiente" },
  { value: "aprobado",         label: "Aprobado" },
  { value: "cancelled",        label: "Cancelado" },
];

const B2C_OPTIONS = [
  { value: "pending_payment", label: "Pendiente" },
  { value: "payment_review",  label: "Revisando pago" },
  { value: "paid",            label: "Pago confirmado" },
  { value: "preparing",       label: "En preparación" },
  { value: "ready",           label: "Listo para despachar" },
  { value: "in_delivery",     label: "En camino" },
  { value: "shipped",         label: "Despachado" },
  { value: "delivered",       label: "Entregado" },
  { value: "cancelled",       label: "Cancelado" },
  { value: "refunded",        label: "Reembolsado" },
];

export function OrderStatusSelect({
  orderId,
  currentStatus,
  channel,
}: {
  orderId:       string;
  currentStatus: string;
  channel:       string;
}) {
  const [localStatus, setLocalStatus] = useState(currentStatus);
  const [isPending,   startTransition] = useTransition();

  const options = channel === "b2b_mayorista" ? B2B_OPTIONS : B2C_OPTIONS;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === localStatus) return;
    setLocalStatus(newStatus);
    startTransition(() => updateOrderStatus(orderId, newStatus));
  }

  const READONLY_LABELS: Record<string, string> = {
    delivered:       "Entregado",
    entrega_parcial: "Entrega parcial",
    cancelled:       "Cancelado",
    refunded:        "Reembolsado",
    despachado:      "Despachado",
    enviado_prod:    "En producción",
    in_delivery:     "En camino",
  };

  // Si el status actual no está en las opciones disponibles (p.ej. despachado,
  // enviado_prod — gestionados desde producción/distribución), mostrar solo lectura
  const inOptions = options.some((o) => o.value === currentStatus);
  const readonlyLabel =
    READONLY_LABELS[currentStatus] ??
    options.find((o) => o.value === currentStatus)?.label ??
    currentStatus;

  if (!inOptions) {
    return (
      <span className="text-xs text-neutral-400 px-2 py-1.5 block">
        {readonlyLabel}
      </span>
    );
  }

  return (
    <select
      value={localStatus}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-700 w-full disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
