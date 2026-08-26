"use client";

import { useState, useTransition } from "react";
import { actualizarComisionOverride } from "./comision-actions";

type Props = {
  clienteId:            string;
  comisionOverride:     number | null;
  comisionGlobal:       number;
};

export function ComisionEdit({ clienteId, comisionOverride, comisionGlobal }: Props) {
  const [editing,   setEditing]   = useState(false);
  const [sinCom,    setSinCom]    = useState(comisionOverride === 0);
  const [valor,     setValor]     = useState(
    comisionOverride != null && comisionOverride > 0
      ? String(Math.round(comisionOverride * 100))
      : ""
  );
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, start]        = useTransition();

  const globalPct = Math.round(comisionGlobal * 100);

  function guardar() {
    setError(null);
    let override: number | null;
    if (sinCom) {
      override = 0;
    } else if (valor.trim() === "") {
      override = null; // vuelve al global
    } else {
      const pct = parseFloat(valor.replace(",", "."));
      if (isNaN(pct) || pct < 0 || pct > 100) {
        setError("Valor inválido (0–100)");
        return;
      }
      override = pct / 100;
    }
    start(async () => {
      const res = await actualizarComisionOverride(clienteId, override);
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
        {comisionOverride === null
          ? <span className="text-neutral-500">{globalPct}% (global)</span>
          : comisionOverride === 0
            ? <span className="text-emerald-600 font-medium">Sin comisión</span>
            : <span className="font-medium">{Math.round(comisionOverride * 100)}% (personalizada)</span>
        }
        <span className="text-neutral-300 group-hover:text-tierra-700 text-xs">✏</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sinCom}
          onChange={e => { setSinCom(e.target.checked); if (e.target.checked) setValor(""); }}
          disabled={isPending}
          className="rounded border-neutral-300 text-tierra-700 focus:ring-tierra-700/20"
        />
        <span className="text-sm text-neutral-700">Sin comisión (0%)</span>
      </label>

      {!sinCom && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder={`Global: ${globalPct}%`}
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
            disabled={isPending}
            className="w-28 px-2 py-1 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50"
          />
          <span className="text-sm text-neutral-400">%</span>
          <span className="text-xs text-neutral-400">(vacío = usar global)</span>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button onClick={guardar} disabled={isPending}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button onClick={() => { setEditing(false); setError(null); }} disabled={isPending}
          className="text-xs text-neutral-400 hover:text-neutral-700 px-1">
          Cancelar
        </button>
      </div>
    </div>
  );
}
