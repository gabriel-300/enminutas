"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/(admin)/admin/pedidos/actions";

const B2B_FLOW = [
  "pending_payment",
  "aprobado",
  "enviado_prod",
  "despachado",
  "en_distribucion",
  "delivered",
];

const B2B_OPTIONS = [
  { value: "pending_payment",  label: "Pendiente" },
  { value: "aprobado",         label: "Aprobado" },
  { value: "enviado_prod",     label: "En producción" },
  { value: "despachado",       label: "Despachado" },
  { value: "en_distribucion",  label: "En distribución" },
  { value: "delivered",        label: "Entregado" },
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

  // B2B: solo se puede avanzar hacia adelante en el flujo + cancelar
  const options = channel === "b2b_mayorista"
    ? (() => {
        const currentIdx = B2B_FLOW.indexOf(currentStatus);
        return B2B_OPTIONS.filter((opt) => {
          if (opt.value === "cancelled") return currentStatus !== "delivered";
          const optIdx = B2B_FLOW.indexOf(opt.value);
          return optIdx >= currentIdx;
        });
      })()
    : B2C_OPTIONS;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === localStatus) return;
    setLocalStatus(newStatus);
    startTransition(() => updateOrderStatus(orderId, newStatus));
  }

  // Si el pedido está entregado o cancelado, no hay nada que cambiar
  if (currentStatus === "delivered" || currentStatus === "cancelled") {
    return (
      <span className="text-xs text-neutral-400 px-2 py-1.5 block">
        {currentStatus === "delivered" ? "Entregado" : "Cancelado"}
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
