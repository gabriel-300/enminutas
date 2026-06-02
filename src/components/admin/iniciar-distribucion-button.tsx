"use client";

import { useTransition } from "react";
import { iniciarDistribucion } from "@/app/(admin)/admin/pedidos/actions";

export function IniciarDistribucionButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => iniciarDistribucion(orderId))}
      disabled={isPending}
      className="shrink-0 px-4 py-2 rounded-xl bg-neutral-800 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {isPending ? "…" : "Iniciar reparto ↗"}
    </button>
  );
}
