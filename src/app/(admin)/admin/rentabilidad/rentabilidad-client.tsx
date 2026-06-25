"use client";

import { useState } from "react";

type FilaCanal = {
  canal: string; label: string;
  ingresos: number; costoMP: number; contribucion: number; pedidos: number;
};
type FilaProducto = {
  nombre: string; linea: string;
  unidades: number; ingresos: number; costoMP: number; contribucion: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function pct(contribucion: number, ingresos: number) {
  if (ingresos === 0) return 0;
  return Math.round((contribucion / ingresos) * 100);
}

function MargenBar({ valor, max }: { valor: number; max: number }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
  const color = w >= 50 ? "bg-emerald-400" : w >= 30 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function RentabilidadClient({
  filasCanal,
  filasProducto,
}: {
  filasCanal: FilaCanal[];
  filasProducto: FilaProducto[];
}) {
  const [tab, setTab] = useState<"canal" | "producto">("canal");
  const [busqueda, setBusqueda] = useState("");

  const filtradosProducto = filasProducto.filter(f =>
    !busqueda || f.nombre.toLowerCase().includes(busqueda.toLowerCase()) || f.linea.toLowerCase().includes(busqueda.toLowerCase())
  );

  const maxContribCanal   = Math.max(...filasCanal.map(f => f.contribucion), 1);
  const maxContribProd    = Math.max(...filtradosProducto.map(f => f.contribucion), 1);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {(["canal", "producto"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-[#16233f] text-[#16233f]"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t === "canal" ? "Por canal" : "Por producto"}
          </button>
        ))}
      </div>

      {tab === "canal" ? (
        /* ── Vista por canal ─────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {filasCanal.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-400">Sin datos en el período seleccionado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Canal</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Pedidos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Ingresos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Costo MP</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Contribución</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filasCanal.map(f => {
                  const m = pct(f.contribucion, f.ingresos);
                  return (
                    <tr key={f.canal} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-neutral-900">{f.label}</p>
                        <MargenBar valor={f.contribucion} max={maxContribCanal} />
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-500 tabular-nums">{f.pedidos}</td>
                      <td className="px-4 py-4 text-right text-neutral-700 tabular-nums">{fmt(f.ingresos)}</td>
                      <td className="px-4 py-4 text-right text-neutral-500 tabular-nums">{fmt(f.costoMP)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-emerald-700 tabular-nums">{fmt(f.contribucion)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-bold tabular-nums ${m >= 50 ? "text-emerald-700" : m >= 30 ? "text-amber-700" : "text-red-700"}`}>
                          {m}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* ── Vista por producto ──────────────────────────────────── */
        <div className="space-y-3">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto o línea..."
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f] w-64"
          />
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            {filtradosProducto.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-neutral-400">Sin datos.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Producto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cajas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Ingresos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Costo MP</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Contribución</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filtradosProducto.map((f, i) => {
                    const m = pct(f.contribucion, f.ingresos);
                    return (
                      <tr key={i} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-neutral-900">{f.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-neutral-400">{f.linea}</p>
                            <MargenBar valor={f.contribucion} max={maxContribProd} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-neutral-500 tabular-nums">{f.unidades.toLocaleString("es-AR")}</td>
                        <td className="px-4 py-3.5 text-right text-neutral-700 tabular-nums">{fmt(f.ingresos)}</td>
                        <td className="px-4 py-3.5 text-right text-neutral-500 tabular-nums">{fmt(f.costoMP)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 tabular-nums">{fmt(f.contribucion)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-sm font-bold tabular-nums ${m >= 50 ? "text-emerald-700" : m >= 30 ? "text-amber-700" : "text-red-700"}`}>
                            {m}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-neutral-400 text-center">
            Costo MP = costo de materia prima por caja × cantidad vendida · no incluye mano de obra ni gastos fijos
          </p>
        </div>
      )}
    </div>
  );
}
