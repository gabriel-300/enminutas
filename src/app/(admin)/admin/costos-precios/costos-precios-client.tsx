"use client";

import { Fragment, useState } from "react";
import { Search } from "lucide-react";

type Canal = { slug: string; label: string };
export type FilaCostoPrecio = {
  id: string;
  name: string;
  sku: string;
  actual: Record<string, number> | null;
  simulado: Record<string, number> | null;
};

const fmtPeso = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// Para buscar sin importar mayúsculas ni tildes.
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CostosPreciosClient({ filas, canales }: { filas: FilaCostoPrecio[]; canales: Canal[] }) {
  const [busqueda, setBusqueda] = useState("");

  const q = normalizar(busqueda.trim());
  const visibles = q === ""
    ? filas
    : filas.filter((f) => normalizar(f.name).includes(q) || normalizar(f.sku).includes(q));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative w-full max-w-[420px]">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-n-500" />
          <input
            type="search"
            placeholder="Buscar por nombre o código…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-400 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700"
          />
        </div>
        {q !== "" && (
          <span className="text-xs text-neutral-600">{visibles.length} de {filas.length} productos</span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th rowSpan={2} className="px-5 py-3 text-xs font-semibold text-neutral-600 border-b border-neutral-100">Producto</th>
                {canales.map((c) => (
                  <th key={c.slug} colSpan={2}
                    className="px-5 pt-3 pb-1 text-sm font-semibold text-neutral-900 text-center border-l border-neutral-100">
                    {c.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-neutral-100 text-left">
                {canales.map((c) => (
                  <Fragment key={c.slug}>
                    <th className="px-5 pb-3 text-xs font-medium text-neutral-600 text-right border-l border-neutral-100">Precio actual</th>
                    <th className="px-5 pb-3 text-xs font-medium text-neutral-600 text-right">Precio sugerido</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={1 + canales.length * 2} className="px-5 py-10 text-center text-neutral-600">
                    Sin resultados para esa búsqueda.
                  </td>
                </tr>
              )}
              {visibles.map((f) => (
                <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-900">{f.name}</p>
                    <p className="text-xs text-neutral-600 font-mono">{f.sku}</p>
                  </td>
                  {canales.map((c) => (
                    <Fragment key={c.slug}>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-700 border-l border-neutral-100">
                        {f.actual ? fmtPeso(f.actual[c.slug]) : <span className="text-neutral-500">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-neutral-900">
                        {f.simulado ? fmtPeso(f.simulado[c.slug]) : <span className="text-neutral-500 font-normal">—</span>}
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
