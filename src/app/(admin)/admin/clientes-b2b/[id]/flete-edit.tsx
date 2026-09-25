"use client";

import { useState, useTransition } from "react";
import { actualizarFleteOverride } from "./flete-actions";

type Props = {
  clienteId:     string;
  fleteOverride: number | null;   // fracción: 0.02 = 2%. null = según zona
};

// fracción → porcentaje para mostrar/editar (0.015 → 1,5)
const aPct = (f: number) => Math.round(f * 10000) / 100;

export function FleteEdit({ clienteId, fleteOverride }: Props) {
  const [editing,   setEditing]   = useState(false);
  const [sinFlete,  setSinFlete]  = useState(fleteOverride === 0);
  const [valor,     setValor]     = useState(
    fleteOverride != null && fleteOverride > 0 ? String(aPct(fleteOverride)) : "",
  );
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, start]        = useTransition();

  function guardar() {
    setError(null);
    let override: number | null;
    if (sinFlete) {
      override = 0;
    } else if (valor.trim() === "") {
      override = null; // vuelve al % de la zona
    } else {
      const pct = parseFloat(valor.replace(",", "."));
      if (isNaN(pct) || pct < 0 || pct >= 100) {
        setError("Valor inválido (0–99,99)");
        return;
      }
      override = pct / 100;
    }
    start(async () => {
      const res = await actualizarFleteOverride(clienteId, override);
      if ("error" in res) { setError(res.error); return; }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-neutral-900 hover:underline group flex items-center gap-1"
        title="Clic para editar"
      >
        {fleteOverride === null
          ? <span className="text-neutral-600">Según zona de entrega</span>
          : fleteOverride === 0
            ? <span className="text-success font-medium">Sin flete</span>
            : <span className="font-medium">{aPct(fleteOverride).toLocaleString("es-AR")}% (personalizado)</span>
        }
        <span className="text-neutral-500 group-hover:text-tierra-700 text-xs">✏</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sinFlete}
          onChange={e => { setSinFlete(e.target.checked); if (e.target.checked) setValor(""); }}
          disabled={isPending}
          className="rounded border-neutral-300 text-tierra-700 focus:ring-tierra-700/20"
        />
        <span className="text-sm text-neutral-700">Sin flete (0%)</span>
      </label>

      {!sinFlete && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Según zona"
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
            disabled={isPending}
            className="w-28 px-2 py-1 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50"
          />
          <span className="text-sm text-neutral-600">%</span>
          <span className="text-xs text-neutral-600">(vacío = usar el de la zona)</span>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button onClick={guardar} disabled={isPending}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button onClick={() => { setEditing(false); setError(null); }} disabled={isPending}
          className="text-xs text-neutral-600 hover:text-neutral-700 px-1">
          Cancelar
        </button>
      </div>
    </div>
  );
}
