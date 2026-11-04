"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarFaltante } from "@/app/(admin)/admin/pedidos/actions";

export function CerrarFaltanteButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cerrar() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await cerrarFaltante(orderId);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "No se pudo cerrar el faltante");
      }
    });
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="mt-3 ml-2 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-white transition-colors"
      >
        Dar por cerrado
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-white border border-neutral-200 p-4 space-y-3">
      <p className="text-xs text-neutral-700">
        El faltante no se va a volver a entregar ni a pedir. Queda registrado y se apaga la alerta.
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setConfirmando(false)}
          disabled={isPending}
          className="px-3 py-2 text-xs rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={cerrar}
          disabled={isPending}
          className="px-3 py-2 text-xs rounded-lg bg-tierra-700 text-white font-medium hover:bg-tierra-800 disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Sí, dar por cerrado"}
        </button>
      </div>
    </div>
  );
}
