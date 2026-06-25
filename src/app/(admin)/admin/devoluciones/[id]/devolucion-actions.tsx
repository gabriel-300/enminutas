"use client";

import { useState, useTransition } from "react";
import { aprobarDevolucion, rechazarDevolucion, cerrarDevolucion } from "../actions";

export function DevolucionActions({ id, estado }: { id: string; estado: string }) {
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
        {estado === "solicitada" && (
          <>
            <button
              onClick={() => run(() => aprobarDevolucion(id))}
              disabled={pending}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {pending ? "..." : "Aprobar"}
            </button>
            <button
              onClick={() => {
                if (!confirm("¿Rechazar esta devolución?")) return;
                run(() => rechazarDevolucion(id));
              }}
              disabled={pending}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Rechazar
            </button>
          </>
        )}
        {estado === "aprobada" && (
          <button
            onClick={() => run(() => cerrarDevolucion(id))}
            disabled={pending}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
          >
            {pending ? "..." : "Marcar cerrada (mercadería recibida)"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
