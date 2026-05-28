"use client";

import { useTransition } from "react";
import { confirmarEntrega } from "@/app/(admin)/admin/pedidos/actions";

export function ConfirmarEntregaButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => confirmarEntrega(orderId))}
      disabled={isPending}
      className="shrink-0 px-4 py-2 rounded-xl bg-success text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {isPending ? "Procesando…" : "Confirmar entrega ✓"}
    </button>
  );
}
