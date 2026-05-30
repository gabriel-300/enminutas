"use client";

import { useState, useTransition } from "react";
import { guardarMeta } from "@/app/(admin)/admin/preventista/actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function BarMeta({ actual, objetivo }: { actual: number; objetivo: number }) {
  const pct = objetivo > 0 ? Math.min((actual / objetivo) * 100, 100) : 0;
  const sobre = actual > objetivo;
  return (
    <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${sobre ? "bg-success" : pct >= 80 ? "bg-tierra-700" : pct >= 50 ? "bg-warning" : "bg-danger"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MetaVendedorCard({
  vendedorId,
  vendedorNombre,
  mes,
  ventasMes,
  objetivo,
  esAdmin,
}: {
  vendedorId:     string;
  vendedorNombre: string;
  mes:            string;
  ventasMes:      number;
  objetivo:       number;
  esAdmin:        boolean;
}) {
  const [editando,   setEditando]   = useState(false);
  const [isPending,  startTransition] = useTransition();
  const [error,      setError]      = useState<string | null>(null);

  const pct = objetivo > 0 ? Math.round((ventasMes / objetivo) * 100) : null;
  const falta = objetivo > 0 ? Math.max(objetivo - ventasMes, 0) : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await guardarMeta(fd);
      if ("error" in result) setError(result.error);
      else setEditando(false);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-neutral-800">{vendedorNombre}</p>
          <p className="text-xs text-neutral-400 mt-0.5 capitalize">
            {new Date(mes + "-01").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>
        </div>
        {esAdmin && (
          <button onClick={() => { setEditando(!editando); setError(null); }}
            className="text-xs text-neutral-400 hover:text-tierra-700 transition-colors">
            {editando ? "Cancelar" : "Editar meta"}
          </button>
        )}
      </div>

      {editando ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <input type="hidden" name="vendedor_id" value={vendedorId} />
          <input type="hidden" name="mes" value={mes} />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">$</span>
              <input
                type="number" name="objetivo" min={0} step={1000}
                defaultValue={objetivo || ""}
                placeholder="500000"
                className="w-full pl-6 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
                disabled={isPending}
              />
            </div>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50">
              {isPending ? "…" : "Guardar"}
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      ) : (
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(ventasMes)}</p>
              {objetivo > 0 && (
                <p className="text-xs text-neutral-400 mt-0.5">de {fmt(objetivo)} objetivo</p>
              )}
              {objetivo === 0 && (
                <p className="text-xs text-neutral-300 mt-0.5">Sin meta definida</p>
              )}
            </div>
            {pct !== null && (
              <div className="text-right">
                <p className={`text-lg font-semibold ${pct >= 100 ? "text-success" : pct >= 80 ? "text-tierra-700" : pct >= 50 ? "text-warning" : "text-danger"}`}>
                  {pct}%
                </p>
                {falta !== null && falta > 0 && (
                  <p className="text-xs text-neutral-400">Faltan {fmt(falta)}</p>
                )}
                {falta === 0 && (
                  <p className="text-xs text-success">¡Meta alcanzada!</p>
                )}
              </div>
            )}
          </div>
          {objetivo > 0 && <BarMeta actual={ventasMes} objetivo={objetivo} />}
        </div>
      )}
    </div>
  );
}
