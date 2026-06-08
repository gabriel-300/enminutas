"use client";

import { useTransition } from "react";
import { marcarEnviadoProd } from "@/app/(admin)/admin/pedidos/actions";

export function MarcarEnviadoProdButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => marcarEnviadoProd(orderId))}
      disabled={isPending}
      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Procesando…" : "Iniciar preparación ✓"}
    </button>
  );
}
