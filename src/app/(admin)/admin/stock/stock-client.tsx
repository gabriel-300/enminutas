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
  sin_stock: { dot: "bg-red-500",   badge: "bg-red-50 text-red-700",     label: "Sin stock" },
  bajo:      { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700", label: "Stock bajo" },
  ok:        { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700", label: "Ok" },
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
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f] w-48"
        />
        <select value={filtroLinea} onChange={e => setFiltroLinea(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-[#16233f]">
          <option value="todas">Todas las líneas</option>
          {lineas.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="flex gap-1.5">
          {(["todas", "sin_stock", "bajo"] as const).map(v => (
            <button key={v} onClick={() => setFiltroAlerta(v)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                filtroAlerta === v ? "bg-[#16233f] text-white border-[#16233f]" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}>
              {v === "todas" ? "Todos" : v === "sin_stock" ? "Sin stock" : "Stock bajo"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {filtradas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">Sin resultados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Disponible</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Comprometido</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Neto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Mínimo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filtradas.map(f => {
                const cfg   = ALERTA_CFG[f.alerta];
                const minLocal = minimoLocal[f.id] !== undefined ? minimoLocal[f.id] : f.minimo;
                const editando = editandoId === f.id;
                return (
                  <tr key={f.id} className={`hover:bg-neutral-50 transition-colors ${f.alerta === "sin_stock" ? "bg-red-50/40" : f.alerta === "bajo" ? "bg-amber-50/30" : ""}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-neutral-900">{f.nombre}</p>
                      <p className="text-xs text-neutral-400">{f.linea} · {f.unit_label}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-neutral-700">{fmt(f.disponible)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-neutral-500">
                      {f.comprometido > 0 ? <span className="text-amber-700 font-medium">{fmt(f.comprometido)}</span> : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-semibold">
                      <span className={f.neto < 0 ? "text-red-700" : f.neto === 0 ? "text-neutral-400" : "text-neutral-900"}>
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
                            className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-xs text-right focus:outline-none focus:border-[#16233f]"
                            placeholder="0"
                          />
                          <button onClick={() => saveEdit(f.id)} disabled={pending}
                            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                            <Check className="size-3.5" />
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(f)}
                          className="group flex items-center gap-1 justify-end text-xs text-neutral-500 hover:text-[#16233f] tabular-nums ml-auto">
                          {minLocal !== null ? fmt(minLocal) : <span className="text-neutral-300">—</span>}
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
      <p className="text-xs text-neutral-400 text-center">
        Disponible = stock físico en lotes activos · Comprometido = pedidos aprobados/en producción/en distribución · Hacé clic en el mínimo para editarlo
      </p>
    </div>
  );
}
