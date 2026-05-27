"use client";

import { useTransition } from "react";
import { confirmarPago } from "@/app/(admin)/admin/pedidos/actions";

export function ConfirmarPagoButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm("¿Confirmar que se recibió el pago?")) return;
        startTransition(() => confirmarPago(orderId));
      }}
      disabled={isPending}
      className="px-4 py-2 rounded-xl bg-success text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {isPending ? "Confirmando…" : "Confirmar pago recibido"}
    </button>
  );
}
