"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type PlanItem = {
  id:               string;
  name:             string;
  sku:              string;
  categoria:        string;
  stock:            number;
  minimo:           number;
  demanda:          number;
  cajasNecesarias:  number;
  minutos:          number | null;
  tieneReceta:      boolean;
  urgente:          boolean;
};

function fmtMin(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function BarCapacidad({ usado, total }: { usado: number; total: number }) {
  const pct = total > 0 ? Math.min((usado / total) * 100, 100) : 0;
  const sobre = usado > total;
  return (
    <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${sobre ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-success"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PlanificadorClient({
  items,
  personasInit,
  horasInit,
}: {
  items:        PlanItem[];
  personasInit: number;
  horasInit:    number;
}) {
  const [personas, setPersonas] = useState(personasInit);
  const [horas,    setHoras]    = useState(horasInit);

  // Tiempo disponible en minutos (asumimos que las personas pueden trabajar en paralelo en distintos productos)
  const disponibleMin = personas * horas * 60;

  // Plan: greedy — agrega productos en orden de prioridad hasta llenar el tiempo
  const { enPlan, fuera, sinReceta, totalMin } = useMemo(() => {
    let acum = 0;
    const enPlan:    PlanItem[] = [];
    const fuera:     PlanItem[] = [];
    const sinReceta: PlanItem[] = [];

    for (const item of items) {
      if (!item.tieneReceta) { sinReceta.push(item); continue; }
      if (item.minutos === null || item.minutos === 0) { sinReceta.push(item); continue; }

      if (acum + item.minutos <= disponibleMin) {
        enPlan.push(item);
        acum += item.minutos;
      } else {
        fuera.push(item);
      }
    }
    return { enPlan, fuera, sinReceta, totalMin: acum };
  }, [items, disponibleMin]);

  const inputCls = "px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 bg-white";

  const noHayNada = items.length === 0;

  return (
    <div className="space-y-6">

      {/* Configuración */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4">Configuración del turno</p>
        <div className="flex items-end gap-6 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Personas disponibles</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setPersonas((p) => Math.max(1, p - 1))}
                className="size-8 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 flex items-center justify-center font-semibold text-base">−</button>
              <span className="w-10 text-center text-lg font-semibold text-neutral-900 tabular-nums">{personas}</span>
              <button onClick={() => setPersonas((p) => p + 1)}
                className="size-8 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 flex items-center justify-center font-semibold text-base">+</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Horas de turno</label>
            <div className="flex gap-1.5 flex-wrap">
              {[4, 6, 8, 10].map((h) => (
                <button key={h} onClick={() => setHoras(h)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${horas === h ? "bg-tierra-700 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                  {h}h
                </button>
              ))}
              <input type="number" min={0.5} max={24} step={0.5} value={horas}
                onChange={(e) => setHoras(parseFloat(e.target.value) || 6)}
                className={`${inputCls} w-20`} />
            </div>
          </div>

          <div className="ml-auto text-right">
            <p className="text-xs text-neutral-400 mb-0.5">Tiempo disponible</p>
            <p className="text-2xl font-semibold font-display text-neutral-900">{fmtMin(disponibleMin)}</p>
            <p className="text-xs text-neutral-400">{personas} persona{personas !== 1 ? "s" : ""} × {horas}h</p>
          </div>
        </div>
      </div>

      {noHayNada ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay productos que necesiten producción ahora.</p>
          <p className="text-xs text-neutral-300 mt-1">Todo el stock está en nivel óptimo.</p>
        </div>
      ) : (
        <>
          {/* Capacidad */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Uso del turno</p>
                <p className="text-sm text-neutral-600 mt-0.5">
                  {fmtMin(totalMin)} necesarios de {fmtMin(disponibleMin)} disponibles
                </p>
              </div>
              <div className="text-right">
                {totalMin <= disponibleMin ? (
                  <span className="text-sm font-semibold text-success">
                    Sobran {fmtMin(disponibleMin - totalMin)}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-danger">
                    Faltan {fmtMin(totalMin - disponibleMin)}
                  </span>
                )}
              </div>
            </div>
            <BarCapacidad usado={totalMin} total={disponibleMin} />
            {fuera.length > 0 && (
              <p className="text-xs text-neutral-400">
                {fuera.length} producto{fuera.length !== 1 ? "s" : ""} no entran en el turno de hoy — quedan para mañana.
              </p>
            )}
          </div>

          {/* Plan del turno */}
          {enPlan.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Producir hoy</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{enPlan.length} producto{enPlan.length !== 1 ? "s" : ""} · {fmtMin(totalMin)}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 w-8">#</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Cajas a producir</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Stock actual</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Tiempo est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {enPlan.map((item, idx) => (
                    <tr key={item.id} className={item.urgente ? "bg-warning-bg/20" : ""}>
                      <td className="px-5 py-3 text-xs font-semibold text-neutral-300 tabular-nums">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-900">{item.name}</p>
                        <p className="text-xs text-neutral-400 font-mono">{item.sku}</p>
                        {item.demanda > 0 && (
                          <p className="text-xs text-tierra-700 mt-0.5">{item.demanda} caja{item.demanda !== 1 ? "s" : ""} comprometida{item.demanda !== 1 ? "s" : ""} en pedidos</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-semibold text-neutral-900 tabular-nums">{item.cajasNecesarias}</span>
                      </td>
                      <td className="px-5 py-3 text-center text-sm tabular-nums">
                        <span className={item.stock === 0 ? "text-danger font-semibold" : item.urgente ? "text-warning font-semibold" : "text-neutral-500"}>
                          {item.stock}
                        </span>
                        {item.minimo > 0 && <span className="text-neutral-300 text-xs"> / {item.minimo}</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-neutral-800 tabular-nums">
                        {fmtMin(item.minutos!)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-200 bg-neutral-50">
                    <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-neutral-500 text-right">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-neutral-900 tabular-nums">{fmtMin(totalMin)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Quedan para mañana */}
          {fuera.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-600">No entra en el turno de hoy</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Necesitarías {fmtMin(fuera.reduce((s, i) => s + (i.minutos ?? 0), 0))} adicionales
                </p>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-neutral-50">
                  {fuera.map((item) => (
                    <tr key={item.id} className="opacity-60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-700">{item.name}</p>
                        <p className="text-xs text-neutral-400 font-mono">{item.sku}</p>
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-neutral-500 tabular-nums">
                        {item.cajasNecesarias} cajas
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-neutral-500 tabular-nums">
                        {item.minutos ? fmtMin(item.minutos) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sin receta */}
          {sinReceta.length > 0 && (
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Sin receta cargada</p>
              <p className="text-xs text-neutral-500 mb-3">
                Estos productos necesitan producción pero no tienen receta — no se puede estimar el tiempo.
              </p>
              <div className="flex flex-wrap gap-2">
                {sinReceta.map((item) => (
                  <Link key={item.id} href={`/admin/cocina/recetas/${item.id}`}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white !text-neutral-700 hover:border-tierra-700 hover:!text-tierra-700 transition-colors">
                    + Receta: {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
