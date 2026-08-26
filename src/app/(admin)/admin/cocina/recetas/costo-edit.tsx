"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { actualizarCostoProducto } from "./actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type Props = {
  productId:        string;
  costoProductoCaja: number;
  bolsasCaja:       number;
  desactualizado:   boolean;
};

export function CostoCajaEdit({ productId, costoProductoCaja, bolsasCaja, desactualizado }: Props) {
  const [editing,   setEditing]   = useState(false);
  const [valor,     setValor]     = useState(String(Math.round(costoProductoCaja)));
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, start]        = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function guardar() {
    const nuevo = parseFloat(valor.replace(",", ".").replace(/\s/g, ""));
    if (isNaN(nuevo) || nuevo <= 0) { setError("Valor inválido"); return; }
    setError(null);
    start(async () => {
      const res = await actualizarCostoProducto(productId, nuevo, bolsasCaja);
      if ("error" in res) { setError(res.error); return; }
      setEditing(false);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter")  guardar();
    if (e.key === "Escape") { setEditing(false); setValor(String(Math.round(costoProductoCaja))); setError(null); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <span className="text-xs text-neutral-400 mr-0.5">$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={handleKey}
          disabled={isPending}
          className="w-24 px-2 py-0.5 text-sm text-right border border-tierra-700/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20 tabular-nums disabled:opacity-50"
        />
        <button onClick={guardar} disabled={isPending}
          className="text-xs font-medium text-tierra-700 hover:text-tierra-800 disabled:opacity-40 px-1">
          {isPending ? "…" : "✓"}
        </button>
        <button onClick={() => { setEditing(false); setValor(String(Math.round(costoProductoCaja))); setError(null); }}
          disabled={isPending}
          className="text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-40">
          ✕
        </button>
        {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Clic para editar el costo del producto"
      className={`font-medium tabular-nums hover:underline cursor-pointer group ${
        desactualizado ? "text-amber-600" : "text-neutral-800"
      }`}
    >
      {fmt(costoProductoCaja)}
      {desactualizado && (
        <span title="El costo guardado difiere del costo real de la receta."
          className="ml-1 text-amber-500">⚠</span>
      )}
      <span className="ml-1 text-neutral-300 group-hover:text-tierra-700 text-xs">✏</span>
    </button>
  );
}
