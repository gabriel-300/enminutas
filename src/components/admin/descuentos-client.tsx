"use client";

import { useState, useTransition } from "react";
import { guardarTier, eliminarTier, toggleTier } from "@/app/(admin)/admin/descuentos/actions";

type Tier = { id: string; min_cajas: number; descuento_pct: number; label: string; activo: boolean };

const inputCls = "px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 w-full";

function TierRow({ tier }: { tier: Tier }) {
  const [editando,  setEditando]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await guardarTier(fd);
      if ("error" in r) setError(r.error);
      else setEditando(false);
    });
  }

  function handleEliminar() {
    if (!confirm("¿Eliminar este escalón de descuento?")) return;
    startTransition(async () => { await eliminarTier(tier.id); });
  }

  function handleToggle() {
    startTransition(async () => { await toggleTier(tier.id, !tier.activo); });
  }

  if (editando) {
    return (
      <tr className="bg-neutral-50">
        <td colSpan={5} className="px-5 py-4">
          <form onSubmit={handleGuardar} className="flex gap-3 items-end flex-wrap">
            <input type="hidden" name="id" value={tier.id} />
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Mín. cajas</label>
              <input type="number" name="min_cajas" min={1} defaultValue={tier.min_cajas}
                className={`${inputCls} w-28`} disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Descuento %</label>
              <div className="relative w-28">
                <input type="number" name="descuento_pct" min={0.1} max={99} step={0.1} defaultValue={tier.descuento_pct}
                  className={`${inputCls} pr-6`} disabled={isPending} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">%</span>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Etiqueta</label>
              <input type="text" name="label" defaultValue={tier.label}
                className={inputCls} disabled={isPending} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50">
                {isPending ? "…" : "Guardar"}
              </button>
              <button type="button" onClick={() => setEditando(false)}
                className="px-3 py-2 text-xs text-neutral-500 hover:text-neutral-700">
                Cancelar
              </button>
            </div>
          </form>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className={`hover:bg-neutral-50 transition-colors ${!tier.activo ? "opacity-50" : ""}`}>
      <td className="px-5 py-3 font-semibold text-neutral-900 tabular-nums">{tier.min_cajas}+</td>
      <td className="px-5 py-3 font-semibold text-tierra-700 tabular-nums">{tier.descuento_pct}%</td>
      <td className="px-5 py-3 text-neutral-600 text-sm">{tier.label}</td>
      <td className="px-5 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tier.activo ? "bg-success-bg text-success" : "bg-neutral-100 text-neutral-400"}`}>
          {tier.activo ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={handleToggle} disabled={isPending}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-40">
            {tier.activo ? "Desactivar" : "Activar"}
          </button>
          <button onClick={() => setEditando(true)} disabled={isPending}
            className="text-xs text-tierra-700 hover:underline disabled:opacity-40">
            Editar
          </button>
          <button onClick={handleEliminar} disabled={isPending}
            className="text-xs text-danger hover:underline disabled:opacity-40">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

function NuevoTierForm() {
  const [open,      setOpen]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd   = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const r = await guardarTier(fd);
      if ("error" in r) setError(r.error);
      else { setOpen(false); form.reset(); }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium rounded-xl bg-tierra-700 text-white hover:bg-tierra-800 transition-colors">
        + Agregar escalón
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap p-4 bg-neutral-50 rounded-xl border border-neutral-200">
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Mín. cajas</label>
        <input type="number" name="min_cajas" min={1} placeholder="20"
          className={`${inputCls} w-28`} disabled={isPending} />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Descuento %</label>
        <div className="relative w-28">
          <input type="number" name="descuento_pct" min={0.1} max={99} step={0.1} placeholder="5"
            className={`${inputCls} pr-6`} disabled={isPending} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">%</span>
        </div>
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Etiqueta (visible al vendedor)</label>
        <input type="text" name="label" placeholder="5% por 20 o más cajas"
          className={inputCls} disabled={isPending} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 text-xs font-medium rounded-xl bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50">
          {isPending ? "…" : "Guardar"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); }}
          className="px-3 py-2 text-xs text-neutral-500 hover:text-neutral-700">
          Cancelar
        </button>
      </div>
      {error && <p className="text-xs text-danger w-full">{error}</p>}
    </form>
  );
}

export function DescuentosClient({ tiers }: { tiers: Tier[] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-neutral-400">Cajas mínimas</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400">Descuento</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400">Etiqueta</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400">Estado</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {tiers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-xs text-neutral-400">
                  Sin escalones configurados. Agregá uno para activar los descuentos por volumen.
                </td>
              </tr>
            )}
            {tiers.map((t) => <TierRow key={t.id} tier={t} />)}
          </tbody>
        </table>
      </div>

      <NuevoTierForm />
    </div>
  );
}
