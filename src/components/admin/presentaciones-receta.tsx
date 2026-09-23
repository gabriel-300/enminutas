"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { vincularPresentacion, desvincularPresentacion } from "@/app/(admin)/admin/cocina/recetas/actions";

export type PresentacionVinculada = {
  id: string; name: string; sku: string | null; unit_label: string | null;
  kg_caja: number | null; cajasPorLote: number | null;
};

export type ProductoVinculable = {
  id: string; name: string; sku: string | null; unit_label: string | null; kg_caja: number | null;
};

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);

export function PresentacionesReceta({
  baseId, baseKgCaja, vinculadas, candidatos,
}: {
  baseId:     string;
  baseKgCaja: number | null;
  vinculadas: PresentacionVinculada[];
  candidatos: ProductoVinculable[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState("");

  function vincular() {
    if (!elegido) return;
    setError(null);
    startTransition(async () => {
      const res = await vincularPresentacion(baseId, elegido);
      if ("error" in res) setError(res.error);
      else { setElegido(""); router.refresh(); }
    });
  }

  function desvincular(id: string, name: string) {
    if (!confirm(`¿Desvincular "${name}" de esta receta? Ya no podrá producirse con ella.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await desvincularPresentacion(id);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-neutral-100">
        <p className="text-sm font-semibold text-neutral-700">Presentaciones que usan esta receta</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          Al producir podés elegir en cuál sale el lote. Las cajas se calculan por peso (kg por caja de cada producto).
        </p>
      </div>

      {!(baseKgCaja && baseKgCaja > 0) && (
        <p className="px-5 py-3 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
          Este producto no tiene kg por caja cargado: sin ese dato no se pueden calcular las equivalencias. Cargalo en Productos.
        </p>
      )}

      {vinculadas.length === 0 ? (
        <p className="px-5 py-4 text-sm text-neutral-400">
          Todavía no hay otras presentaciones vinculadas. Se produce solo el producto de esta receta.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {vinculadas.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{p.name}</p>
                <p className="text-xs text-neutral-400">
                  {p.sku && <span className="font-mono mr-2">{p.sku}</span>}
                  {p.unit_label}
                  {p.kg_caja ? ` · ${fmt(p.kg_caja)} kg/caja` : ""}
                </p>
              </div>
              <p className="text-xs text-neutral-500 tabular-nums shrink-0">
                {p.cajasPorLote !== null ? `1 lote = ${fmt(p.cajasPorLote)} cajas` : "falta kg/caja"}
              </p>
              <button type="button" onClick={() => desvincular(p.id, p.name)} disabled={isPending}
                className="text-xs text-danger hover:underline disabled:opacity-40 shrink-0">
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-4 border-t border-neutral-100 space-y-2">
        <div className="flex items-center gap-2">
          <select value={elegido} onChange={e => setElegido(e.target.value)} disabled={isPending}
            className="flex-1 min-w-0 truncate px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50">
            <option value="">— Agregar presentación (producto sin receta propia) —</option>
            {candidatos.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.unit_label ? ` · ${c.unit_label}` : ""}{c.sku ? ` (${c.sku})` : ""}{c.kg_caja ? "" : " — sin kg/caja"}
              </option>
            ))}
          </select>
          <button type="button" onClick={vincular} disabled={isPending || !elegido}
            className="shrink-0 px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
            Vincular
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          ¿La presentación no existe (ej. empanada x32)? Creala primero en Productos con su kg por caja y después vinculala acá.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
