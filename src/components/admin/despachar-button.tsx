"use client";

import { useTransition } from "react";
import { despacharPedido } from "@/app/(admin)/admin/pedidos/actions";

export function DespacharButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => despacharPedido(orderId))}
      disabled={isPending}
      className="shrink-0 px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Procesando…" : "Despachar ✓"}
    </button>
  );
}
