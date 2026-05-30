"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { getOrderLinesForReorder } from "@/app/(b2b)/b2b/pedidos/actions";

export function ReorderButton({
  orderId,
  variant = "default",
}: {
  orderId: string;
  variant?: "default" | "small";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { clearCart, addItem } = useCartStore();

  function handleReorder() {
    startTransition(async () => {
      try {
        const lines = await getOrderLinesForReorder(orderId);
        clearCart();
        for (const line of lines) {
          addItem({
            productId: line.productId,
            sku:       line.sku,
            name:      line.name,
            price:     line.price,
            quantity:  line.quantity,
            unitLabel: line.unitLabel,
            imageUrl:  line.imageUrl,
          });
        }
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
