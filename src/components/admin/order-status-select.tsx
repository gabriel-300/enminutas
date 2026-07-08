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
  const [error,       setError]        = useState<string | null>(null);

  const options = channel === "b2b_mayorista" ? B2B_OPTIONS : B2C_OPTIONS;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === localStatus) return;
    const prevStatus = localStatus;
    setLocalStatus(newStatus);
    setError(null);
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, newStatus);
      } catch (err) {
        setLocalStatus(prevStatus);
        setError(err instanceof Error ? err.message : "Error al cambiar estado");
      }
    });
  }

  const READONLY_LABELS: Record<string, string> = {
    cancelled:    "Cancelado",
    refunded:     "Reembolsado",
    despachado:   "Despachado",
    enviado_prod: "En producción",
    in_delivery:  "En camino",
    liquidado:    "Liquidado",
  };

  const selectCls = "text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-700 w-full disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-tierra-700/20";

  // Estados que no se pueden modificar una vez alcanzados
  if (currentStatus in READONLY_LABELS) {
    return (
      <span className="text-xs text-neutral-400 px-2 py-1.5 block">
        {READONLY_LABELS[currentStatus]}
      </span>
    );
  }

  // Desde entregado o entrega_parcial solo se puede pasar a liquidado
  if (currentStatus === "delivered" || currentStatus === "entrega_parcial") {
    const currentLabel = currentStatus === "delivered" ? "Entregado" : "Entrega parcial";
    return (
      <div>
        <select value={localStatus} onChange={handleChange} disabled={isPending} className={selectCls}>
          <option value={currentStatus}>{currentLabel}</option>
          <option value="liquidado">Liquidado</option>
        </select>
        {error && <p className="text-[10px] text-danger mt-1 leading-tight">{error}</p>}
      </div>
    );
  }

  // Estado no reconocido y fuera de las opciones (fallback seguro)
  if (!options.some((o) => o.value === currentStatus)) {
    return (
      <span className="text-xs text-neutral-400 px-2 py-1.5 block">
        {currentStatus}
      </span>
    );
  }

  return (
    <div>
      <select value={localStatus} onChange={handleChange} disabled={isPending} className={selectCls}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[10px] text-danger mt-1 leading-tight">{error}</p>}
    </div>
  );
}
