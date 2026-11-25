"use client";

import { useState, useTransition } from "react";
import { actualizarSaldoBanco } from "./actions";
import { fmt } from "@/lib/format";
import { fmtFechaHora } from "@/lib/fecha";

export function SaldoBancoForm({ saldo, fecha, notas }: { saldo: number; fecha: string | null; notas: string | null }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor]       = useState(String(Math.round(saldo)));
  const [nota, setNota]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  function guardar() {
    const n = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(n)) { setError("Valor inválido"); return; }
    setError(null);
    start(async () => {
      const res = await actualizarSaldoBanco(n, nota);
      if (res.error) { setError(res.error); return; }
      setEditando(false);
      setNota("");
    });
  }

  if (!editando) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-neutral-900">{fmt(saldo)}</p>
          <p className="text-xs text-neutral-600 mt-0.5">
            {fecha ? `Cargado ${fmtFechaHora(fecha)}` : "Todavía no se cargó el saldo del banco"}
            {notas && ` — ${notas}`}
          </p>
        </div>
        <button
          onClick={() => { setEditando(true); setValor(String(Math.round(saldo))); }}
          className="shrink-0 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
        >
          Actualizar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-600">$</span>
        <input
          type="text" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)}
          disabled={isPending} autoFocus
          className="w-32 px-2 py-1 text-sm text-right border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30"
        />
        <button onClick={guardar} disabled={isPending}
          className="px-2 py-1 rounded-lg bg-brand-700 text-white text-xs disabled:opacity-50">
          {isPending ? "…" : "Guardar"}
        </button>
        <button onClick={() => { setEditando(false); setError(null); }} disabled={isPending}
          className="px-2 py-1 rounded-lg border text-xs text-neutral-600">
          Cancelar
        </button>
      </div>
      <input
        type="text" value={nota} onChange={e => setNota(e.target.value)}
        placeholder="Nota (opcional, ej: según home banking)"
        disabled={isPending}
        className="w-full px-2 py-1 text-xs border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
