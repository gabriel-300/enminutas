"use client";

import { useState, useTransition } from "react";
import { agregarNota } from "@/app/(admin)/admin/pedidos/actions";

export function NotasPedidoForm({ orderId, initialNota }: { orderId: string; initialNota: string | null }) {
  const [nota, setNota] = useState(initialNota ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      await agregarNota(orderId, nota);
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-5">
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">Notas internas</p>
      <textarea
        value={nota}
        onChange={(e) => { setNota(e.target.value); setSaved(false); }}
        placeholder="Tracking, instrucciones de despacho, observaciones…"
        rows={3}
        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
        disabled={isPending}
      />
      <div className="flex items-center gap-3 mt-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-xs rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar nota"}
        </button>
        {saved && <p className="text-xs text-success">Guardado</p>}
      </div>
    </form>
  );
}
