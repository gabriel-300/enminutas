"use client";

import { useState, useTransition, useRef, Fragment } from "react";
import { Pencil, Trash2, Check, X, Upload, Plus, PackagePlus } from "lucide-react";
import {
  crearInsumo, actualizarInsumo, eliminarInsumo, importarPreciosCSV,
  ingresarStock, ajustarStock, actualizarStockControl,
  type ImportResult,
} from "./actions";

export type Insumo = {
  id: string; nombre: string; unidad: string;
  precio_unitario: number; proveedor: string | null;
  updated_at: string;
  stock_actual: number;
  stock_minimo: number;
  punto_pedido: number;
  stock_maximo: number;
  categoria: string;
};

const UNIDADES = ["gr", "kg", "ml", "l", "u", "cc", "taza", "cdita", "cda"];

const CATEGORIAS: { value: string; label: string; color: string }[] = [
  { value: "verduras",      label: "Verduras",        color: "bg-green-100 text-green-700" },
  { value: "frutas",        label: "Frutas",           color: "bg-orange-100 text-orange-700" },
  { value: "carnes",        label: "Carnes",           color: "bg-red-100 text-red-700" },
  { value: "lacteos",       label: "Lácteos",          color: "bg-sky-100 text-sky-700" },
  { value: "panificados",   label: "Panificados",      color: "bg-amber-100 text-amber-700" },
  { value: "condimentos",   label: "Condimentos",      color: "bg-purple-100 text-purple-700" },
  { value: "aceites_grasas",label: "Aceites y grasas", color: "bg-yellow-100 text-yellow-700" },
  { value: "bebidas",       label: "Bebidas",          color: "bg-cyan-100 text-cyan-700" },
  { value: "otros",         label: "Otros",            color: "bg-neutral-100 text-neutral-500" },
];

function catLabel(value: string) {
  return CATEGORIAS.find(c => c.value === value)?.label ?? value;
}
function catColor(value: string) {
  return CATEGORIAS.find(c => c.value === value)?.color ?? "bg-neutral-100 text-neutral-500";
}

const fmtPrecio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 4 }).format(n);

const fmtNum = (n: number, u: string) =>
  `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(n)} ${u}`;

const fmtFecha = (s: string) =>
  new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

function stockEstado(ins: Insumo): "critico" | "pedido" | "ok" | "sin_control" {
  const hayControl = ins.stock_minimo > 0 || ins.punto_pedido > 0;
  if (!hayControl) return "sin_control";
  if (ins.stock_actual <= ins.stock_minimo) return "critico";
  if (ins.stock_actual <= ins.punto_pedido) return "pedido";
  return "ok";
}

const estadoBadge = {
  critico:     "bg-red-100 text-red-700",
  pedido:      "bg-amber-100 text-amber-700",
  ok:          "bg-emerald-100 text-emerald-700",
  sin_control: "bg-neutral-100 text-neutral-500",
};

const estadoDot = {
  critico:     "bg-red-500",
  pedido:      "bg-amber-400",
  ok:          "bg-emerald-500",
  sin_control: "bg-neutral-300",
};

// ── Mini-form ingreso de stock ────────────────────────────────────────────────
function IngresoStockForm({ ins, onClose, onError }: {
  ins: Insumo; onClose: () => void; onError: (e: string) => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const [notas, setNotas]       = useState("");
  const [isPending, start]      = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cant = parseFloat(cantidad.replace(",", "."));
    if (isNaN(cant) || cant <= 0) { onError("Cantidad inválida"); return; }
    start(async () => {
      const res = await ingresarStock(ins.id, cant, notas.trim() || null);
      if ("error" in res) { onError(res.error); return; }
      onClose();
    });
  }

  const inputCls = "px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 disabled:opacity-50";

  return (
    <tr className="bg-emerald-50/60">
      <td colSpan={8} className="px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1.5">
              Ingreso de stock — {ins.nombre}
            </p>
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="block text-xs text-neutral-500 mb-0.5">Cantidad ({ins.unidad})</label>
                <input
                  value={cantidad} onChange={e => setCantidad(e.target.value)}
                  inputMode="decimal" placeholder="0" autoFocus required
                  className={`${inputCls} w-28 text-right`} disabled={isPending}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-neutral-500 mb-0.5">Notas (opcional)</label>
                <input
                  value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Ej: Compra Proveedor X"
                  className={`${inputCls} w-full`} disabled={isPending}
                />
              </div>
              <button type="submit" disabled={isPending}
                className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-emerald-700 transition-colors">
                {isPending ? "Guardando…" : "Confirmar ingreso"}
              </button>
              <button type="button" onClick={onClose}
                className="px-3 py-1.5 border border-neutral-200 text-sm text-neutral-500 rounded-lg hover:bg-neutral-50">
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </td>
    </tr>
  );
}

// ── Fila de insumo ─────────────────────────────────────────────────────────────
function InsumoRow({ ins, onError }: { ins: Insumo; onError: (e: string) => void }) {
  const [editing, setEditing]   = useState(false);
  const [ingreso, setIngreso]   = useState(false);
  const [nombre, setNombre]     = useState(ins.nombre);
  const [unidad, setUnidad]     = useState(ins.unidad);
  const [precio, setPrecio]     = useState(String(ins.precio_unitario));
  const [proveed, setProveed]   = useState(ins.proveedor ?? "");
  const [cat, setCat]           = useState(ins.categoria || "otros");
  const [sMin, setSMin]         = useState(String(ins.stock_minimo));
  const [sPed, setSPed]         = useState(String(ins.punto_pedido));
  const [sMax, setSMax]         = useState(String(ins.stock_maximo));
  const [isPending, start]      = useTransition();

  const estado = stockEstado(ins);

  function handleGuardar() {
    const fd = new FormData();
    fd.set("nombre", nombre); fd.set("unidad", unidad);
    fd.set("precio_unitario", precio); fd.set("proveedor", proveed);
    fd.set("categoria", cat);
    start(async () => {
      const res = await actualizarInsumo(ins.id, fd);
      if ("error" in res) { onError(res.error); resetState(); return; }
      // Guardar también los campos de stock control
      const rsc = await actualizarStockControl(
        ins.id,
        parseFloat(sMin.replace(",", ".")) || 0,
        parseFloat(sPed.replace(",", ".")) || 0,
        parseFloat(sMax.replace(",", ".")) || 0,
      );
      if ("error" in rsc) { onError(rsc.error); }
      setEditing(false);
    });
  }

  function resetState() {
    setNombre(ins.nombre); setUnidad(ins.unidad);
    setPrecio(String(ins.precio_unitario)); setProveed(ins.proveedor ?? "");
    setCat(ins.categoria || "otros");
    setSMin(String(ins.stock_minimo)); setSPed(String(ins.punto_pedido)); setSMax(String(ins.stock_maximo));
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
      <>
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
          <td className="px-4 py-2">
            <select value={cat} onChange={e => setCat(e.target.value)}
              className={`${inputCls} w-36`} disabled={isPending}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </td>
          {/* Stock control */}
          <td className="px-4 py-2">
            <input value={sMin} onChange={e => setSMin(e.target.value)}
              className={`${inputCls} w-20 text-right`} disabled={isPending}
              inputMode="decimal" placeholder="0" title="Stock mínimo" />
          </td>
          <td className="px-4 py-2">
            <input value={sPed} onChange={e => setSPed(e.target.value)}
              className={`${inputCls} w-20 text-right`} disabled={isPending}
              inputMode="decimal" placeholder="0" title="Punto de pedido" />
          </td>
          <td className="px-4 py-2">
            <input value={sMax} onChange={e => setSMax(e.target.value)}
              className={`${inputCls} w-20 text-right`} disabled={isPending}
              inputMode="decimal" placeholder="0" title="Stock máximo" />
          </td>
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
        {ingreso && (
          <IngresoStockForm ins={ins} onClose={() => setIngreso(false)} onError={onError} />
        )}
      </>
    );
  }

  return (
    <>
      <tr className="hover:bg-neutral-50 transition-colors">
        <td className="px-4 py-3 font-medium text-neutral-900 text-sm">{ins.nombre}</td>
        <td className="px-4 py-3 text-sm text-neutral-500 font-mono">{ins.unidad}</td>
        <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right tabular-nums">
          {fmtPrecio(ins.precio_unitario)}
        </td>
        <td className="px-4 py-3 text-sm text-neutral-400">{ins.proveedor || "—"}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor(ins.categoria)}`}>
            {catLabel(ins.categoria)}
          </span>
        </td>
        {/* Stock actual con indicador */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block size-2 rounded-full shrink-0 ${estadoDot[estado]}`} />
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${estadoBadge[estado]}`}>
              {fmtNum(ins.stock_actual, ins.unidad)}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-neutral-400 tabular-nums font-mono">
          {ins.stock_minimo > 0 ? fmtNum(ins.stock_minimo, ins.unidad) : "—"}
        </td>
        <td className="px-4 py-3 text-xs text-neutral-400 tabular-nums font-mono">
          {ins.punto_pedido > 0 ? fmtNum(ins.punto_pedido, ins.unidad) : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1 justify-end">
            <button onClick={() => { setIngreso(v => !v); setEditing(false); }} disabled={isPending}
              title="Registrar ingreso de stock"
              className="p-1.5 rounded-lg text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
              <PackagePlus className="size-4" />
            </button>
            <button onClick={() => { setEditing(true); setIngreso(false); }} disabled={isPending}
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
      {ingreso && (
        <IngresoStockForm ins={ins} onClose={() => setIngreso(false)} onError={onError} />
      )}
    </>
  );
}

// ── Formulario nuevo insumo ────────────────────────────────────────────────────
function NuevoInsumoForm({ onError }: { onError: (e: string) => void }) {
  const [open, setOpen]       = useState(false);
  const [nombre, setNombre]   = useState("");
  const [unidad, setUnidad]   = useState("gr");
  const [precio, setPrecio]   = useState("");
  const [proveed, setProveed] = useState("");
  const [cat, setCat]         = useState("otros");
  const [isPending, start]    = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("nombre", nombre); fd.set("unidad", unidad);
    fd.set("precio_unitario", precio); fd.set("proveedor", proveed);
    fd.set("categoria", cat);
    start(async () => {
      const res = await crearInsumo(fd);
      if ("error" in res) { onError(res.error); return; }
      setNombre(""); setPrecio(""); setProveed(""); setCat("otros"); setOpen(false);
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
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Categoría</label>
        <select value={cat} onChange={e => setCat(e.target.value)} disabled={isPending}
          className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none bg-white">
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
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
            Actualiza los precios de los insumos que matcheen por nombre.
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
                  <p className="font-medium mb-1">No encontrados ({result.noEncontrados.length}):</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {result.noEncontrados.map(n => <li key={n}>{n}</li>)}
                  </ul>
                </div>
              )}
              {result.errores.length > 0 && (
                <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
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

// ── Panel alertas de stock ─────────────────────────────────────────────────────
function AlertasStock({ insumos }: { insumos: Insumo[] }) {
  const criticos = insumos.filter(i => stockEstado(i) === "critico");
  const pedido   = insumos.filter(i => stockEstado(i) === "pedido");
  if (criticos.length === 0 && pedido.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100">
        <p className="text-sm font-semibold text-neutral-800">Alertas de stock</p>
      </div>
      <div className="divide-y divide-neutral-50">
        {criticos.map(i => (
          <div key={i.id} className="px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-sm font-medium text-neutral-900">{i.nombre}</span>
            </div>
            <div className="text-xs text-right">
              <span className="font-mono text-red-600 font-semibold">{fmtNum(i.stock_actual, i.unidad)}</span>
              <span className="text-neutral-400 ml-1">· mín {fmtNum(i.stock_minimo, i.unidad)}</span>
            </div>
          </div>
        ))}
        {pedido.map(i => (
          <div key={i.id} className="px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-sm text-neutral-700">{i.nombre}</span>
            </div>
            <div className="text-xs text-right">
              <span className="font-mono text-amber-700 font-semibold">{fmtNum(i.stock_actual, i.unidad)}</span>
              <span className="text-neutral-400 ml-1">· reponer en {fmtNum(i.punto_pedido, i.unidad)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function InsumosClient({ insumos }: { insumos: Insumo[] }) {
  const [error, setError]         = useState<string | null>(null);
  const [busqueda, setBusqueda]   = useState("");
  const [catFiltro, setCatFiltro] = useState("");

  const filtrados = insumos.filter(i => {
    if (catFiltro && i.categoria !== catFiltro) return false;
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return i.nombre.toLowerCase().includes(q)
      || (i.proveedor ?? "").toLowerCase().includes(q)
      || catLabel(i.categoria).toLowerCase().includes(q);
  });

  // Agrupar por categoría (solo cuando no hay filtro de categoría activo)
  const grupos: { cat: string; items: Insumo[] }[] = [];
  if (!catFiltro && !busqueda) {
    const orden = CATEGORIAS.map(c => c.value);
    const agrupado: Record<string, Insumo[]> = {};
    for (const ins of filtrados) {
      const k = ins.categoria || "otros";
      if (!agrupado[k]) agrupado[k] = [];
      agrupado[k].push(ins);
    }
    for (const cat of orden) {
      if (agrupado[cat]?.length) grupos.push({ cat, items: agrupado[cat] });
    }
    // Categorías que no están en la lista predefinida
    for (const [cat, items] of Object.entries(agrupado)) {
      if (!orden.includes(cat)) grupos.push({ cat, items });
    }
  } else {
    grupos.push({ cat: "", items: filtrados });
  }

  return (
    <div className="space-y-5">
      <NuevoInsumoForm onError={setError} />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 text-xs">✕</button>
        </p>
      )}

      <AlertasStock insumos={insumos} />
      <ImportadorCSV insumos={insumos} />

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-neutral-800">
            Catálogo <span className="font-normal text-neutral-400">({insumos.length})</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            <select
              value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
              className="text-sm border border-neutral-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 bg-white"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="text-sm border border-neutral-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 w-40"
            />
          </div>
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
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide text-right">Precio / u.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Proveedor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Stock actual</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Mínimo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Pto. pedido</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {grupos.map(({ cat, items }) => (
                  <Fragment key={cat || "all"}>
                    {cat && (
                      <tr className="bg-neutral-50/70">
                        <td colSpan={9} className="px-4 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColor(cat)}`}>
                            {catLabel(cat)}
                          </span>
                          <span className="text-xs text-neutral-400 ml-2">{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
                        </td>
                      </tr>
                    )}
                    {items.map(ins => (
                      <InsumoRow key={ins.id} ins={ins} onError={setError} />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
