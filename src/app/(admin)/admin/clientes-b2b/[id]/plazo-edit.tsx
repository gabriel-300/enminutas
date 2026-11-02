"use client";

import { useState, useTransition } from "react";
import { actualizarPlazoPago } from "./plazo-actions";

const PLAZO_DEFECTO = 30;

export function PlazoEdit({ clienteId, plazo }: { clienteId: string; plazo: number | null }) {
  const [editing, setEditing] = useState(false);
  const [valor,   setValor]   = useState(plazo != null ? String(plazo) : "");
  const [error,   setError]   = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  function guardar() {
    setError(null);
    let dias: number | null = null;
    if (valor.trim() !== "") {
      dias = Number(valor);
      if (!Number.isInteger(dias) || dias < 0 || dias > 365) { setError("Días enteros entre 0 y 365"); return; }
    }
    start(async () => {
      const res = await actualizarPlazoPago(clienteId, dias);
      if ("error" in res) { setError(res.error); return; }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-sm text-neutral-900 hover:underline group flex items-center gap-1" title="Clic para editar">
        {plazo == null
          ? <span className="text-neutral-600">{PLAZO_DEFECTO} días (por defecto)</span>
          : plazo === 0
            ? <span className="font-medium">Contado</span>
            : <span className="font-medium">{plazo} días</span>}
        <span className="text-neutral-500 group-hover:text-tierra-700 text-xs">✏</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input type="text" inputMode="numeric" placeholder={String(PLAZO_DEFECTO)} value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
          disabled={isPending}
          className="w-24 px-2 py-1 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50" />
        <span className="text-sm text-neutral-600">días</span>
        <span className="text-xs text-neutral-600">(0 = contado; vacío = {PLAZO_DEFECTO})</span>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={guardar} disabled={isPending}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button onClick={() => { setEditing(false); setError(null); }} disabled={isPending}
          className="text-xs text-neutral-600 hover:text-neutral-700 px-1">Cancelar</button>
      </div>
    </div>
  );
}
