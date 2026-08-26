"use client";

import { useState, useTransition, useRef } from "react";
import { Pencil, Trash2, Check, X, Upload, Plus } from "lucide-react";
import {
  crearInsumo, actualizarInsumo, eliminarInsumo, importarPreciosCSV,
  type ImportResult,
} from "./actions";

export type Insumo = {
  id: string; nombre: string; unidad: string;
  precio_unitario: number; proveedor: string | null;
  updated_at: string;
};

const UNIDADES = ["gr", "kg", "ml", "l", "u", "cc", "taza", "cdita", "cda"];

const fmtPrecio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 4 }).format(n);

const fmtFecha = (s: string) =>
  new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

// ── Fila de insumo ─────────────────────────────────────────────────────────────
function InsumoRow({ ins, onError }: { ins: Insumo; onError: (e: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre]   = useState(ins.nombre);
  const [unidad, setUnidad]   = useState(ins.unidad);
  const [precio, setPrecio]   = useState(String(ins.precio_unitario));
  const [proveed, setProveed] = useState(ins.proveedor ?? "");
  const [isPending, start]    = useTransition();

  function handleGuardar() {
    const fd = new FormData();
    fd.set("nombre", nombre);
    fd.set("unidad", unidad);
    fd.set("precio_unitario", precio);
    fd.set("proveedor", proveed);
    start(async () => {
      const res = await actualizarInsumo(ins.id, fd);
      if ("error" in res) { onError(res.error); resetState(); }
      setEditing(false);
    });
  }

  function resetState() {
    setNombre(ins.nombre); setUnidad(ins.unidad);
    setPrecio(String(ins.precio_unitario)); setProveed(ins.proveedor ?? "");
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar "${ins.nombre}"?`)) return;
    start(async () => {
      const res = await eliminarInsumo(ins.id);
      if ("error" in res) onError(res.error);
    });
  }

  const inputCls = "px-2 py-1 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 disabled:opacity-50";

  if (editing) {
    return (
      <tr className="bg-blue-50/50">
        <td className="px-4 py-2">
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            className={`${inputCls} w-full`} disabled={isPending} autoFocus />
        </td>
        <td className="px-4 py-2">
          <select value={unidad} onChange={e => setUnidad(e.target.value)}
            className={`${inputCls} w-20`} disabled={isPending}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <input value={precio} onChange={e => setPrecio(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleGuardar(); if (e.key === "Escape") { setEditing(false); resetState(); }}}
            className={`${inputCls} w-28 text-right`} disabled={isPending}
            inputMode="decimal" placeholder="0" />
        </td>
        <td className="px-4 py-2">
          <input value={proveed} onChange={e => setProveed(e.target.value)}
            className={`${inputCls} w-full`} disabled={isPending} placeholder="Proveedor (opcional)" />
        </td>
        <td className="px-4 py-2 text-xs text-neutral-400">{fmtFecha(ins.updated_at)}</td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <button onClick={handleGuardar} disabled={isPending}
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">
              <Check className="size-4" />
            </button>
            <button onClick={() => { setEditing(false); resetState(); }}
              className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100">
              <X className="size-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-3 font-medium text-neutral-900 text-sm">{ins.nombre}</td>
      <td className="px-4 py-3 text-sm text-neutral-500 font-mono">{ins.unidad}</td>
      <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right tabular-nums">
        {fmtPrecio(ins.precio_unitario)}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-400">{ins.proveedor || "—"}</td>
      <td className="px-4 py-3 text-xs text-neutral-400">{fmtFecha(ins.updated_at)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1 justify-end">
          <button onClick={() => setEditing(true)} disabled={isPending}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <Pencil className="size-4" />
          </button>
          <button onClick={handleEliminar} disabled={isPending}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Formulario nuevo insumo ────────────────────────────────────────────────────
function NuevoInsumoForm({ onError }: { onError: (e: string) => void }) {
  const [open, setOpen]       = useState(false);
  const [nombre, setNombre]   = useState("");
  const [unidad, setUnidad]   = useState("gr");
  const [precio, setPrecio]   = useState("");
  const [proveed, setProveed] = useState("");
  const [isPending, start]    = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("nombre", nombre); fd.set("unidad", unidad);
    fd.set("precio_unitario", precio); fd.set("proveedor", proveed);
    start(async () => {
      const res = await crearInsumo(fd);
      if ("error" in res) { onError(res.error); return; }
      setNombre(""); setPrecio(""); setProveed(""); setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#16233f] text-white text-sm font-medium rounded-xl hover:bg-[#253760] transition-colors">
        <Plus className="size-4" /> Nuevo insumo
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}
      className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre *</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus
          placeholder="Harina 000" disabled={isPending}
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16233f]/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Unidad</label>
        <select value={unidad} onChange={e => setUnidad(e.target.value)} disabled={isPending}
          className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none bg-white">
          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Precio / unidad ($)</label>
        <input value={precio} onChange={e => setPrecio(e.target.value)} required
          inputMode="decimal" placeholder="0" disabled={isPending}
          className="w-28 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 text-right" />
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Proveedor</label>
        <input value={proveed} onChange={e => setProveed(e.target.value)}
          placeholder="Opcional" disabled={isPending}
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16233f]/20" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending || !nombre.trim()}
          className="px-4 py-2 bg-[#16233f] text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-[#253760] transition-colors">
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2 border border-neutral-200 text-sm text-neutral-600 rounded-xl hover:bg-neutral-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Importador CSV ─────────────────────────────────────────────────────────────
function ImportadorCSV({ insumos }: { insumos: Insumo[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult]   = useState<ImportResult | null>(null);
  const [isPending, start]    = useTransition();

  function descargarTemplate() {
    // Separador ; porque en Excel Argentina la coma es separador decimal
    const header = "nombre;precio";
    const filas = insumos.length > 0
      ? insumos.map(i => `${i.nombre};${i.precio_unitario}`).join("\n")
      : "Harina 000;0\nHuevo;0\nMozzarella;0";
    const contenido = `${header}\n${filas}`;
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "precios-insumos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      start(async () => {
        const res = await importarPreciosCSV(text);
        setResult(res);
        if (fileRef.current) fileRef.current.value = "";
      });
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-neutral-100 rounded-xl"><Upload className="size-4 text-neutral-500" /></div>
        <div>
          <p className="text-sm font-semibold text-neutral-800">Importar precios desde CSV</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            Cargá un archivo con dos columnas: <span className="font-mono bg-neutral-100 px-1 rounded">nombre,precio</span>.
            Actualiza los precios de los insumos que matcheen por nombre. Separá con coma, punto y coma o tabulación.
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        <label className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-neutral-300 rounded-xl text-sm text-neutral-600 hover:border-[#16233f] hover:text-[#16233f] cursor-pointer transition-colors ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload className="size-4" />
          {isPending ? "Procesando…" : "Elegir archivo CSV"}
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} disabled={isPending} />
        </label>
        <button type="button" onClick={descargarTemplate}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#16233f] transition-colors">
          ↓ Bajar template{insumos.length > 0 ? ` con los ${insumos.length} insumos actuales` : ""}
        </button>
        <span className="text-xs text-neutral-400">Formatos: .csv · .txt · Excel guardado como CSV</span>
      </div>

      {result && (
        <div className="mt-4 space-y-2">
          {"error" in result ? (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{result.error}</p>
          ) : (
            <>
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg font-medium">
                ✓ {result.actualizados} insumo{result.actualizados !== 1 ? "s" : ""} actualizado{result.actualizados !== 1 ? "s" : ""}
              </p>
              {result.noEncontrados.length > 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                  <p className="font-medium mb-1">No encontrados ({result.noEncontrados.length}) — verificá el nombre:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {result.noEncontrados.map(n => <li key={n}>{n}</li>)}
                  </ul>
                </div>
              )}
              {result.errores.length > 0 && (
                <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                  <p className="font-medium mb-1">Errores:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {result.errores.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function InsumosClient({ insumos }: { insumos: Insumo[] }) {
  const [error, setError]   = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = insumos.filter(i =>
    !busqueda ||
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.proveedor ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <NuevoInsumoForm onError={setError} />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 text-xs">✕</button>
        </p>
      )}

      <ImportadorCSV insumos={insumos} />

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-800">
            Catálogo <span className="font-normal text-neutral-400">({insumos.length})</span>
          </p>
          <input
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="text-sm border border-neutral-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 w-48"
          />
        </div>

        {filtrados.length === 0 ? (
          <p className="px-5 py-10 text-sm text-neutral-400 text-center">
            {insumos.length === 0
              ? "Todavía no hay insumos. Creá el primero con el botón de arriba."
              : "Sin resultados para esa búsqueda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Unidad</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide text-right">Precio / unidad</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Proveedor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Actualizado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtrados.map(ins => (
                  <InsumoRow key={ins.id} ins={ins} onError={setError} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
