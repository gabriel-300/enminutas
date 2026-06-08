"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrderLinesForReorder } from "@/app/(b2b)/b2b/pedidos/actions";

const REORDER_KEY = "b2b-reorder-pending";

export function ReorderButton({
  orderId,
  variant = "default",
}: {
  orderId: string;
  variant?: "default" | "small";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleReorder() {
    startTransition(async () => {
      try {
        const lines = await getOrderLinesForReorder(orderId);
        const qtys: Record<string, number> = {};
        for (const line of lines) qtys[line.productId] = line.quantity;
        localStorage.setItem(REORDER_KEY, JSON.stringify(qtys));
        router.push("/b2b/catalogo");
      } catch {
        alert("Error al cargar el pedido. Intentá de nuevo.");
      }
    });
  }

  if (variant === "small") {
    return (
      <button
        onClick={handleReorder}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-tierra-700 !text-tierra-700 hover:bg-tierra-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Cargando…" : "Repetir pedido"}
      </button>
    );
  }

  return (
    <button
      onClick={handleReorder}
      disabled={isPending}
      className="w-full py-3 rounded-xl border-2 border-tierra-700 text-tierra-700 text-sm font-semibold hover:bg-tierra-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Cargando productos al carrito…" : "🔁 Repetir este pedido"}
    </button>
  );
}
