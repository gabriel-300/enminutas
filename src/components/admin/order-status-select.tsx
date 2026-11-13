"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus, cancelarPedidoDistribucion, cancelarPedidoEntregado } from "@/app/(admin)/admin/pedidos/actions";
// Solo los 3 estados que updateOrderStatus permite asignar manualmente.
// Los otros (enviado_prod, despachado, etc.) se cambian desde producción/distribución.
const B2B_OPTIONS = [
  { value: "pending_payment",  label: "Pendiente de aprobación" },
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

  const options = channel === "b2b_mayorista" || channel === "muestra" ? B2B_OPTIONS : B2C_OPTIONS;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === localStatus) return;

    const cancelandoEnDistribucion =
      newStatus === "cancelled" && (localStatus === "despachado" || localStatus === "en_distribucion");
    if (cancelandoEnDistribucion) {
      const ok = confirm(
        "¿Cancelar este pedido? Se reintegra el stock ya despachado y, si es cuenta corriente, se revierte el cargo."
      );
      if (!ok) return;
    }

    // Un pedido ya entregado se cancela con motivo (queda en el historial): devuelve el stock y sale de la deuda.
    const cancelandoEntregado =
      newStatus === "cancelled" && (localStatus === "delivered" || localStatus === "entrega_parcial");
    let motivo = "";
    if (cancelandoEntregado) {
      const dado = prompt(
        "Cancelar un pedido ya entregado: se devuelve el stock y sale de la deuda del cliente.\n\nMotivo de la cancelación (queda registrado):"
      );
      if (dado === null) return;
      motivo = dado.trim();
      if (motivo.length < 3) { setError("Indicá el motivo de la cancelación"); return; }
    }

    const prevStatus = localStatus;
    setLocalStatus(newStatus);
    setError(null);
    startTransition(async () => {
      try {
        if (cancelandoEntregado) {
          await cancelarPedidoEntregado(orderId, motivo);
        } else if (cancelandoEnDistribucion) {
          await cancelarPedidoDistribucion(orderId);
        } else {
          const res = await updateOrderStatus(orderId, newStatus);
          if (res && "saldoPendiente" in res) {
            const ok = confirm(
              `${res.saldoPendiente}\n\nSi lo liquidás igual, esa deuda dejará de aparecer. ¿Liquidar de todos modos?`
            );
            if (!ok) throw new Error("Liquidación cancelada: el pedido tiene saldo sin cobrar.");
            await updateOrderStatus(orderId, newStatus, true);
          }
        }
      } catch (err) {
        setLocalStatus(prevStatus);
        setError(err instanceof Error ? err.message : "Error al cambiar estado");
      }
    });
  }

  const READONLY_LABELS: Record<string, string> = {
    cancelled:  "Cancelado",
    refunded:   "Reembolsado",
    in_delivery: "En camino",
    liquidado:  "Liquidado",
  };

  const selectCls = "text-xs border border-neutral-400 rounded-lg px-2 py-1.5 bg-white text-neutral-700 w-full disabled:opacity-50 focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700";

  // Estados que no se pueden modificar una vez alcanzados
  if (currentStatus in READONLY_LABELS) {
    return (
      <span className="text-xs text-neutral-600 px-2 py-1.5 block">
        {READONLY_LABELS[currentStatus]}
      </span>
    );
  }

  // Desde entregado o entrega_parcial se puede pasar a liquidado o cancelar (con motivo, si no tiene cobros)
  if (currentStatus === "delivered" || currentStatus === "entrega_parcial") {
    const currentLabel = currentStatus === "delivered" ? "Entregado" : "Entrega parcial";
    return (
      <div>
        <select value={localStatus} onChange={handleChange} disabled={isPending} className={selectCls}>
          <option value={currentStatus}>{currentLabel}</option>
          <option value="liquidado">Liquidado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        {error && <p className="text-xs text-danger mt-1 leading-tight">{error}</p>}
      </div>
    );
  }

  // Enviado a producción: solo se puede cancelar (vuelve a aprobado o cancela)
  if (currentStatus === "enviado_prod") {
    return (
      <div>
        <select value={localStatus} onChange={handleChange} disabled={isPending} className={selectCls}>
          <option value="enviado_prod">En producción</option>
          <option value="aprobado">Aprobado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        {error && <p className="text-xs text-danger mt-1 leading-tight">{error}</p>}
      </div>
    );
  }

  // Despachado / en distribución: única acción manual posible es cancelar
  // (revierte stock y cta cte — ver cancelarPedidoDistribucion)
  if (currentStatus === "despachado" || currentStatus === "en_distribucion") {
    const currentLabel = currentStatus === "despachado" ? "Despachado" : "En distribución";
    return (
      <div>
        <select value={localStatus} onChange={handleChange} disabled={isPending} className={selectCls}>
          <option value={currentStatus}>{currentLabel}</option>
          <option value="cancelled">Cancelado</option>
        </select>
        {error && <p className="text-xs text-danger mt-1 leading-tight">{error}</p>}
      </div>
    );
  }

  // Estado no reconocido y fuera de las opciones (fallback seguro)
  if (!options.some((o) => o.value === currentStatus)) {
    return (
      <span className="text-xs text-neutral-600 px-2 py-1.5 block">
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
      {error && <p className="text-xs text-danger mt-1 leading-tight">{error}</p>}
    </div>
  );
}
