"use client";

import { fmt } from "@/lib/format";
import { useState, useTransition } from "react";
import { actualizarPkgProducto } from "./actions";

type Props = {
  productId:   string;
  pkgUnitario: number;
  pkgBulto:    number;
  /** packaging de la receta por caja, solo informativo */
  pkgReceta:   number;
};

export function PkgEdit({ productId, pkgUnitario, pkgBulto, pkgReceta }: Props) {
  const [editing, setEditing] = useState(false);
  const [u, setU] = useState(String(pkgUnitario));
  const [b, setB] = useState(String(pkgBulto));
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const num = (s: string) => parseFloat(s.replace(",", ".").replace(/\s/g, ""));

  function cancelar() { setEditing(false); setU(String(pkgUnitario)); setB(String(pkgBulto)); setError(null); }

  function guardar() {
    const nu = num(u), nb = num(b);
    if (isNaN(nu) || isNaN(nb) || nu < 0 || nb < 0) { setError("Valor inválido"); return; }
    setError(null);
    start(async () => {
      const res = await actualizarPkgProducto(productId, nu, nb);
      if ("error" in res) { setError(res.error); return; }
      setEditing(false);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") guardar();
    if (e.key === "Escape") cancelar();
  }

  const inputCls = "w-20 px-2 py-0.5 text-sm text-right border border-tierra-700/40 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 tabular-nums disabled:opacity-50";

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end flex-wrap">
        <span className="text-xs text-neutral-600">U $</span>
        <input autoFocus value={u} onChange={e => setU(e.target.value)} onKeyDown={handleKey}
          inputMode="decimal" disabled={isPending} className={inputCls} />
        <span className="text-xs text-neutral-600 ml-1">B $</span>
        <input value={b} onChange={e => setB(e.target.value)} onKeyDown={handleKey}
          inputMode="decimal" disabled={isPending} className={inputCls} />
        <button onClick={guardar} disabled={isPending}
          className="text-xs font-medium text-tierra-700 hover:text-tierra-800 disabled:opacity-40 px-1">
          {isPending ? "…" : "✓"}
        </button>
        <button onClick={cancelar} disabled={isPending}
          className="text-xs text-neutral-600 hover:text-neutral-700 disabled:opacity-40">✕</button>
        {error && <span className="text-xs text-danger ml-1">{error}</span>}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)}
      title="Clic para editar el packaging por bolsa (U) y por caja (B)"
      className="font-medium tabular-nums text-neutral-800 hover:underline cursor-pointer group whitespace-nowrap">
      U {fmt(pkgUnitario)} · B {fmt(pkgBulto)}
      <span className="ml-1 text-neutral-500 group-hover:text-tierra-700 text-xs">✏</span>
      {pkgReceta > 0 && (
        <span className="block text-xs font-normal text-neutral-500">receta: {fmt(pkgReceta)} / caja</span>
      )}
    </button>
  );
}
