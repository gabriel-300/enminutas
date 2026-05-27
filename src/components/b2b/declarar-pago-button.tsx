"use client";

import { useTransition } from "react";
import { declararPago } from "@/app/(b2b)/b2b/pedidos/actions";

export function DeclararPagoButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => declararPago(orderId))}
      disabled={isPending}
      className="w-full px-4 py-3 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Registrando…" : "Ya realicé la transferencia"}
    </button>
  );
}
