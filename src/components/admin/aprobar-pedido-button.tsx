"use client";

import { useTransition } from "react";
import { aprobarPedidoB2B } from "@/app/(admin)/admin/pedidos/actions";

export function AprobarPedidoButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => aprobarPedidoB2B(orderId))}
      disabled={isPending}
      className="px-4 py-2 rounded-xl bg-success text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {isPending ? "Aprobando…" : "Aprobar pedido B2B"}
    </button>
  );
}
