"use client";

import { useState, useTransition } from "react";
import { emitirFactura, marcarCobrada, anularFactura } from "../actions";

export function FacturaActions({ id, estado }: { id: string; estado: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {estado === "borrador" && (
          <button
            onClick={() => run(() => emitirFactura(id))}
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-colors disabled:opacity-50"
          >
            {pending ? "..." : "Emitir"}
          </button>
        )}
        {estado === "emitida" && (
          <button
            onClick={() => run(() => marcarCobrada(id))}
            disabled={pending}
            className="px-4 py-2 rounded-xl bg-success text-white text-sm font-medium hover:bg-success transition-colors disabled:opacity-50"
          >
            {pending ? "..." : "Marcar cobrada"}
          </button>
        )}
        {(estado === "borrador" || estado === "emitida") && (
          <button
            onClick={() => {
              if (!confirm("¿Anular este comprobante? Esta acción no se puede deshacer.")) return;
              run(() => anularFactura(id));
            }}
            disabled={pending}
            className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Anular
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
