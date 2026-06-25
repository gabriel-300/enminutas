"use client";

import { useState, useTransition } from "react";
import { guardarObjetivo } from "./actions";
import { Edit2, Check, X } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const CANAL_LABEL: Record<string, string> = {
  b2b_mayorista:  "B2B Mayorista",
  b2c_nacional:   "B2C Nacional",
  pedido_ya_local: "PedidosYa",
  global:         "Global (todos)",
};

const CANAL_COLOR: Record<string, string> = {
  b2b_mayorista:   "bg-blue-500",
  b2c_nacional:    "bg-emerald-500",
  pedido_ya_local: "bg-amber-500",
  global:          "bg-[#16233f]",
};

type MesData = {
  anio: number;
  mes: number;
  label: string;
  canales: {
    canal: string;
    real: number;
    meta: number;
    pct: number;
  }[];
  totalReal: number;
  totalMeta: number;
  totalPct: number;
};

export function ObjetivosClient({ meses }: { meses: MesData[] }) {
  const [pending, start] = useTransition();
  const [editando, setEditando]  = useState<{ anio: number; mes: number; canal: string } | null>(null);
  const [valor, setValor]        = useState("");
  const [error, setError]        = useState<string | null>(null);

  function startEdit(anio: number, mes: number, canal: string, actual: number) {
    setEditando({ anio, mes, canal });
    setValor(String(actual));
    setError(null);
  }

  function cancelEdit() { setEditando(null); setValor(""); setError(null); }

  function saveEdit() {
    if (!editando) return;
    const monto = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(monto) || monto < 0) { setError("Valor inválido"); return; }
    setError(null);
    start(async () => {
      const res = await guardarObjetivo(editando.anio, editando.mes, editando.canal, monto);
      if (res.error) { setError(res.error); return; }
      setEditando(null); setValor("");
    });
  }

  const mesActual = meses[meses.length - 1]; // último = mes en curso

  return (
    <div className="space-y-8">
      {/* Mes actual — progress bars por canal */}
      {mesActual && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">{mesActual.label} — en curso</h2>
            <div className="text-right">
              <p className="text-xs text-neutral-400">Total real vs meta</p>
              <p className="text-lg font-bold text-neutral-900 tabular-nums">
                {fmt(mesActual.totalReal)}
                <span className="text-sm font-normal text-neutral-400 ml-1">/ {fmt(mesActual.totalMeta)}</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-50">
            {mesActual.canales.map(c => {
              const isEdit = editando?.anio === mesActual.anio && editando?.mes === mesActual.mes && editando?.canal === c.canal;
              const barColor = CANAL_COLOR[c.canal] ?? "bg-neutral-400";
              const pct = Math.min(100, c.pct);
              return (
                <div key={c.canal} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-800">{CANAL_LABEL[c.canal] ?? c.canal}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-neutral-600">
                        {fmt(c.real)} <span className="text-neutral-300">/</span>{" "}
                        {isEdit ? (
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={valor}
                              onChange={e => setValor(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                              className="w-28 rounded-lg border border-[#16233f] px-2 py-0.5 text-sm text-right focus:outline-none"
                              autoFocus
                            />
                            <button onClick={saveEdit} disabled={pending} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Check className="size-4" /></button>
                            <button onClick={cancelEdit} className="p-1 rounded text-neutral-400 hover:bg-neutral-100"><X className="size-4" /></button>
                          </span>
                        ) : (
                          <button
                            onClick={() => startEdit(mesActual.anio, mesActual.mes, c.canal, c.meta)}
                            className="group inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
                          >
                            {fmt(c.meta)}
                            <Edit2 className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </span>
                      <span className={`text-sm font-semibold tabular-nums w-12 text-right ${c.pct >= 100 ? "text-emerald-600" : c.pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                        {c.meta > 0 ? `${Math.round(c.pct)}%` : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {error && isEdit && <p className="text-xs text-red-600 mt-1">{error}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla histórica — todos los meses */}
      <div>
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Histórico mensual</h2>
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Mes</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">B2B</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">B2C</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Real total</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Meta total</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {[...meses].reverse().map(m => {
                const b2b = m.canales.find(c => c.canal === "b2b_mayorista");
                const b2c = m.canales.find(c => c.canal === "b2c_nacional");
                const pct = m.totalMeta > 0 ? Math.round((m.totalReal / m.totalMeta) * 100) : null;
                const isEdit = editando?.anio === m.anio && editando?.mes === m.mes && editando?.canal === "global";
                return (
                  <tr key={`${m.anio}-${m.mes}`} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-900">{m.label}</td>
                    <td className="px-5 py-3 text-right text-neutral-600 tabular-nums">
                      {b2b ? fmt(b2b.real) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-neutral-600 tabular-nums">
                      {b2c ? fmt(b2c.real) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">
                      {fmt(m.totalReal)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {isEdit ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number" min="0" step="1000" value={valor}
                            onChange={e => setValor(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                            className="w-28 rounded-lg border border-[#16233f] px-2 py-0.5 text-sm text-right focus:outline-none"
                            autoFocus
                          />
                          <button onClick={saveEdit} disabled={pending} className="p-1 text-emerald-600"><Check className="size-3.5" /></button>
                          <button onClick={cancelEdit} className="p-1 text-neutral-400"><X className="size-3.5" /></button>
                        </span>
                      ) : (
                        <button
                          onClick={() => startEdit(m.anio, m.mes, "global", m.totalMeta)}
                          className="group inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
                        >
                          {m.totalMeta > 0 ? fmt(m.totalMeta) : <span className="text-neutral-300">sin meta</span>}
                          <Edit2 className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {pct !== null ? (
                        <span className={`text-sm font-semibold tabular-nums ${pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                          {pct}%
                        </span>
                      ) : <span className="text-neutral-300 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400 mt-2 px-1">Hacé click en cualquier meta para editarla.</p>
      </div>
    </div>
  );
}
