"use client";

import { useState, useTransition } from "react";
import { confirmarEntrega } from "@/app/(admin)/admin/pedidos/actions";

export function ConfirmarEntregaButton({ orderId }: { orderId: string }) {
  const [confirming,  setConfirming]  = useState(false);
  const [isPending,   startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-success text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Confirmar entrega ✓
      </button>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-xs text-neutral-500 text-center">¿Confirmar la entrega?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => startTransition(() => confirmarEntrega(orderId))}
          disabled={isPending}
          className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-success text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "…" : "Sí, entregar"}
        </button>
      </div>
    </div>
  );
}
