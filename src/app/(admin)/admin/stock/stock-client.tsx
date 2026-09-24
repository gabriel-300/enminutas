"use client";

import { useState, useTransition } from "react";
import { actualizarStockMinimo } from "./actions";
import { Edit2, Check, X } from "lucide-react";

type Fila = {
  id: string;
  nombre: string;
  unit_label: string;
  linea: string;
  disponible: number;
  comprometido: number;
  neto: number;
  minimo: number | null;
  alerta: "sin_stock" | "bajo" | "ok";
};

const ALERTA_CFG = {
  sin_stock: { dot: "bg-danger-solid",   badge: "bg-danger-bg text-danger",     label: "Sin stock" },
  bajo:      { dot: "bg-warning-solid", badge: "bg-warning-bg text-warning", label: "Stock bajo" },
  ok:        { dot: "bg-success-solid", badge: "bg-success-bg text-success", label: "Ok" },
};

export function StockClient({ filas, lineas }: { filas: Fila[]; lineas: string[] }) {
  const [filtroLinea, setFiltroLinea]     = useState("todas");
  const [filtroAlerta, setFiltroAlerta]   = useState<"todas" | "sin_stock" | "bajo">("todas");
  const [busqueda, setBusqueda]           = useState("");
  const [editandoId, setEditandoId]       = useState<string | null>(null);
  const [editValor, setEditValor]         = useState("");
  const [pending, start]                  = useTransition();
  const [minimoLocal, setMinimoLocal]     = useState<Record<string, number | null>>({});

  const filtradas = filas.filter(f => {
    if (filtroLinea !== "todas" && f.linea !== filtroLinea) return false;
    if (filtroAlerta === "sin_stock" && f.alerta !== "sin_stock") return false;
    if (filtroAlerta === "bajo" && f.alerta !== "bajo") return false;
    if (busqueda && !f.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const orden = { sin_stock: 0, bajo: 1, ok: 2 };
    if (orden[a.alerta] !== orden[b.alerta]) return orden[a.alerta] - orden[b.alerta];
    return a.nombre.localeCompare(b.nombre, "es");
  });

  function startEdit(f: Fila) {
    setEditandoId(f.id);
    const actual = minimoLocal[f.id] !== undefined ? minimoLocal[f.id] : f.minimo;
    setEditValor(actual !== null ? String(actual) : "");
  }

  function cancelEdit() { setEditandoId(null); setEditValor(""); }

  function saveEdit(id: string) {
    const val = editValor === "" ? null : parseFloat(editValor);
    start(async () => {
      await actualizarStockMinimo(id, val);
      setMinimoLocal(prev => ({ ...prev, [id]: val }));
      setEditandoId(null);
    });
  }

  const fmt = (n: number) => n % 1 === 0 ? n.toLocaleString("es-AR") : n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="rounded-lg border border-neutral-400 px-3 py-2 text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 w-48"
        />
        <select value={filtroLinea} onChange={e => setFiltroLinea(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-700">
          <option value="todas">Todas las líneas</option>
          {lineas.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="flex gap-1.5">
          {(["todas", "sin_stock", "bajo"] as const).map(v => (
            <button key={v} onClick={() => setFiltroAlerta(v)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                filtroAlerta === v ? "bg-brand-700 text-white border-brand-700" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}>
              {v === "todas" ? "Todos" : v === "sin_stock" ? "Sin stock" : "Stock bajo"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        {filtradas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-600">Sin resultados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-600">Producto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600">Disponible</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600">Comprometido</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600">Neto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600">Mínimo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filtradas.map(f => {
                const cfg   = ALERTA_CFG[f.alerta];
                const minLocal = minimoLocal[f.id] !== undefined ? minimoLocal[f.id] : f.minimo;
                const editando = editandoId === f.id;
                return (
                  <tr key={f.id} className={`hover:bg-neutral-50 transition-colors ${f.alerta === "sin_stock" ? "bg-danger-bg/40" : f.alerta === "bajo" ? "bg-warning-bg/30" : ""}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-neutral-900">{f.nombre}</p>
                      <p className="text-xs text-neutral-600">{f.linea} · {f.unit_label}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-neutral-700">{fmt(f.disponible)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-neutral-600">
                      {f.comprometido > 0 ? <span className="text-warning font-medium">{fmt(f.comprometido)}</span> : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-semibold">
                      <span className={f.neto < 0 ? "text-danger" : f.neto === 0 ? "text-neutral-600" : "text-neutral-900"}>
                        {fmt(f.neto)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {editando ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number" min="0" step="1"
                            value={editValor}
                            onChange={e => setEditValor(e.target.value)}
                            autoFocus
                            className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-xs text-right focus:outline-none focus:border-brand-700"
                            placeholder="0"
                          />
                          <button onClick={() => saveEdit(f.id)} disabled={pending}
                            className="p-1 rounded-lg text-success hover:bg-success-bg transition-colors">
                            <Check className="size-3.5" />
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(f)}
                          className="group flex items-center gap-1 justify-end text-xs text-neutral-600 hover:text-brand-700 tabular-nums ml-auto">
                          {minLocal !== null ? fmt(minLocal) : <span className="text-neutral-500">—</span>}
                          <Edit2 className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-neutral-600 text-center">
        Disponible = stock físico en lotes activos · Comprometido = pedidos aprobados/en producción/en distribución · Hacé clic en el mínimo para editarlo
      </p>
    </div>
  );
}
