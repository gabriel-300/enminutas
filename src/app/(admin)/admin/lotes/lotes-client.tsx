"use client";

import { useState, useTransition, useId } from "react";
import { crearLote, ajustarCantidad, darDeBajaLote } from "./actions";
import { Plus, X, AlertTriangle, PackageX } from "lucide-react";

type Lote = {
  id: string;
  producto_id: string;
  producto_nombre: string;
  numero_lote: string;
  fecha_ingreso: string;
  fecha_vencimiento: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  unidad: string;
  proveedor: string | null;
  deposito_id: string | null;
  deposito_nombre: string | null;
  estado: "vencido" | "critico" | "proximo" | "vigente";
  dias_restantes: number;
};

type Producto  = { id: string; name: string; unit_label: string };
type Deposito  = { id: string; nombre: string };

const ESTADO_CFG = {
  vencido: { label: "Vencido",       bg: "#fef2f2", text: "#dc2626", dot: "bg-red-500" },
  critico: { label: "Vence pronto",  bg: "#fff7ed", text: "#c2410c", dot: "bg-orange-500" },
  proximo: { label: "Próximo a vencer", bg: "#fffbeb", text: "#b45309", dot: "bg-amber-400" },
  vigente: { label: "Vigente",       bg: "#ecfdf5", text: "#059669", dot: "bg-emerald-500" },
};

const today = () => new Date().toISOString().slice(0, 10);

export function LotesClient({
  lotes,
  productos,
  depositos,
}: {
  lotes: Lote[];
  productos: Producto[];
  depositos: Deposito[];
}) {
  const formId = useId();
  const [filtro, setFiltro]         = useState<"todos" | "vencido" | "critico" | "proximo" | "vigente">("todos");
  const [filtroDeposito, setFiltroDeposito] = useState<string>("todos");
  const [showForm, setShowForm]     = useState(false);
  const [pending, start]            = useTransition();
  const [error, setError]           = useState<string | null>(null);

  // Form state
  const [productoId, setProductoId]         = useState("");
  const [numeroLote, setNumeroLote]         = useState("");
  const [fechaIngreso, setFechaIngreso]     = useState(today());
  const [fechaVenc, setFechaVenc]           = useState("");
  const [cantidad, setCantidad]             = useState("");
  const [unidad, setUnidad]                 = useState("kg");
  const [proveedor, setProveedor]           = useState("");
  const [costo, setCosto]                   = useState("");
  const [obs, setObs]                       = useState("");
  const [depositoId, setDepositoId]         = useState("");

  // Ajuste inline
  const [ajustando, setAjustando] = useState<string | null>(null);
  const [nuevaCant, setNuevaCant] = useState("");

  const lotesFiltrados = lotes
    .filter(l => filtro === "todos" || l.estado === filtro)
    .filter(l => filtroDeposito === "todos" || l.deposito_id === filtroDeposito || (filtroDeposito === "__sin__" && !l.deposito_id));
  const vencidos  = lotes.filter(l => l.estado === "vencido").length;
  const criticos  = lotes.filter(l => l.estado === "critico").length;

  // FEFO: para cada producto, marcar el lote más próximo a vencer (activos)
  const fefoMap = new Map<string, string>();
  const activosOrdenados = [...lotes]
    .filter(l => l.estado !== "vencido" && l.cantidad_actual > 0)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  for (const l of activosOrdenados) {
    if (!fefoMap.has(l.producto_id)) fefoMap.set(l.producto_id, l.id);
  }

  function resetForm() {
    setProductoId(""); setNumeroLote(""); setFechaIngreso(today());
    setFechaVenc(""); setCantidad(""); setUnidad("kg");
    setProveedor(""); setCosto(""); setObs(""); setDepositoId("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productoId) { setError("Seleccioná un producto"); return; }
    const cant = parseFloat(cantidad.replace(",", "."));
    if (!cant || cant <= 0) { setError("La cantidad debe ser mayor a 0"); return; }
    setError(null);
    start(async () => {
      const res = await crearLote({
        productoId,
        numeroLote,
        fechaIngreso,
        fechaVencimiento: fechaVenc,
        cantidadInicial: cant,
        unidad,
        proveedor:     proveedor    || undefined,
        costoUnitario: costo ? parseFloat(costo.replace(",", ".")) : undefined,
        observaciones: obs          || undefined,
        depositoId:    depositoId   || undefined,
      });
      if (res.error) { setError(res.error); return; }
      resetForm();
      setShowForm(false);
    });
  }

  function handleAjuste(id: string) {
    const val = parseFloat(nuevaCant.replace(",", "."));
    if (isNaN(val) || val < 0) return;
    start(async () => {
      const res = await ajustarCantidad(id, val);
      if (res.error) setError(res.error);
      setAjustando(null); setNuevaCant("");
    });
  }

  function handleBaja(id: string, nro: string) {
    if (!confirm(`¿Dar de baja el lote ${nro}? Se marcará como inactivo con cantidad 0.`)) return;
    start(async () => {
      const res = await darDeBajaLote(id);
      if (res.error) setError(res.error);
    });
  }

  const labelClass = "block text-xs font-medium text-neutral-500 mb-1";
  const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]";
  const productoActual = productos.find(p => p.id === productoId);

  return (
    <div className="space-y-5">
      {/* Alertas */}
      {(vencidos > 0 || criticos > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            {vencidos > 0 && <span className="font-semibold">{vencidos} lote{vencidos > 1 ? "s" : ""} vencido{vencidos > 1 ? "s" : ""}. </span>}
            {criticos > 0 && <span>{criticos} lote{criticos > 1 ? "s" : ""} vence{criticos > 1 ? "n" : ""} en menos de 7 días. </span>}
            Revisá y dá de baja los que correspondan.
          </div>
        </div>
      )}

      {/* Header acciones */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          {/* Filtros estado */}
          <div className="flex gap-1.5 flex-wrap">
            {(["todos", "vencido", "critico", "proximo", "vigente"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  filtro === f
                    ? "bg-[#16233f] text-white"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {f === "todos" ? "Todos" : ESTADO_CFG[f].label}
                {f !== "todos" && (
                  <span className="ml-1.5 opacity-70">{lotes.filter(l => l.estado === f).length}</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors shrink-0"
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Cancelar" : "Nuevo lote"}
          </button>
        </div>
        {/* Filtro depósito */}
        {depositos.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFiltroDeposito("todos")}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${filtroDeposito === "todos" ? "bg-neutral-800 text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
            >
              Todos los depósitos
            </button>
            {depositos.map(d => (
              <button
                key={d.id}
                onClick={() => setFiltroDeposito(d.id)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${filtroDeposito === d.id ? "bg-neutral-800 text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
              >
                {d.nombre}
              </button>
            ))}
            <button
              onClick={() => setFiltroDeposito("__sin__")}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${filtroDeposito === "__sin__" ? "bg-neutral-800 text-white" : "bg-white border border-neutral-200 text-neutral-400 hover:bg-neutral-50"}`}
            >
              Sin asignar
            </button>
          </div>
        )}
      </div>

      {/* Formulario nuevo lote */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Registrar nuevo lote</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-prod`} className={labelClass}>Producto *</label>
                <select
                  id={`${formId}-prod`}
                  value={productoId}
                  onChange={e => {
                    setProductoId(e.target.value);
                    const p = productos.find(p => p.id === e.target.value);
                    if (p) setUnidad(p.unit_label);
                  }}
                  className={inputClass}
                  required
                >
                  <option value="">Seleccioná un producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${formId}-nro`} className={labelClass}>Número de lote *</label>
                <input
                  id={`${formId}-nro`}
                  type="text"
                  placeholder="Ej: L-2026-001"
                  value={numeroLote}
                  onChange={e => setNumeroLote(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-ingreso`} className={labelClass}>Fecha de ingreso</label>
                <input
                  id={`${formId}-ingreso`}
                  type="date"
                  value={fechaIngreso}
                  onChange={e => setFechaIngreso(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${formId}-venc`} className={labelClass}>Fecha de vencimiento *</label>
                <input
                  id={`${formId}-venc`}
                  type="date"
                  value={fechaVenc}
                  onChange={e => setFechaVenc(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor={`${formId}-cant`} className={labelClass}>Cantidad inicial *</label>
                <input
                  id={`${formId}-cant`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="0"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor={`${formId}-unidad`} className={labelClass}>Unidad</label>
                <input
                  id={`${formId}-unidad`}
                  type="text"
                  value={unidad}
                  onChange={e => setUnidad(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${formId}-costo`} className={labelClass}>Costo unitario ($)</label>
                <input
                  id={`${formId}-costo`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={costo}
                  onChange={e => setCosto(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-prov`} className={labelClass}>Proveedor</label>
                <input
                  id={`${formId}-prov`}
                  type="text"
                  placeholder="Nombre del proveedor"
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  className={inputClass}
                />
              </div>
              {depositos.length > 0 && (
                <div>
                  <label htmlFor={`${formId}-deposito`} className={labelClass}>Depósito</label>
                  <select
                    id={`${formId}-deposito`}
                    value={depositoId}
                    onChange={e => setDepositoId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sin asignar</option>
                    {depositos.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-obs`} className={labelClass}>Observaciones</label>
              <input
                id={`${formId}-obs`}
                type="text"
                placeholder="Notas adicionales..."
                value={obs}
                onChange={e => setObs(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-2.5 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Registrar lote"}
            </button>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {lotesFiltrados.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">
            {filtro === "todos" ? "No hay lotes registrados aún." : "No hay lotes en esta categoría."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Producto / Lote</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Depósito</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Vencimiento</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Stock actual</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Ingreso</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {lotesFiltrados.map(lote => {
                const cfg    = ESTADO_CFG[lote.estado];
                const esFefo = fefoMap.get(lote.producto_id) === lote.id;
                const pctUso = lote.cantidad_inicial > 0
                  ? Math.round(((lote.cantidad_inicial - lote.cantidad_actual) / lote.cantidad_inicial) * 100)
                  : 0;

                return (
                  <tr key={lote.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-neutral-900">{lote.producto_nombre}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Lote: {lote.numero_lote}
                            {lote.proveedor && ` · ${lote.proveedor}`}
                          </p>
                        </div>
                        {esFefo && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#16233f] text-white shrink-0">
                            FEFO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                        {lote.dias_restantes >= 0
                          ? ` (${lote.dias_restantes}d)`
                          : ` (${Math.abs(lote.dias_restantes)}d)`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-neutral-500 whitespace-nowrap">
                      {lote.deposito_nombre ?? <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-600 tabular-nums whitespace-nowrap">
                      {new Date(lote.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {ajustando === lote.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={nuevaCant}
                            onChange={e => setNuevaCant(e.target.value)}
                            className="w-20 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#16233f]/30"
                            autoFocus
                          />
                          <button onClick={() => handleAjuste(lote.id)} disabled={pending}
                            className="px-2 py-1 rounded-lg bg-[#16233f] text-white text-xs disabled:opacity-50">✓</button>
                          <button onClick={() => { setAjustando(null); setNuevaCant(""); }}
                            className="px-2 py-1 rounded-lg border text-xs text-neutral-500">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAjustando(lote.id); setNuevaCant(String(lote.cantidad_actual)); }}
                          className="text-right group"
                          title="Click para ajustar"
                        >
                          <span className="font-semibold text-neutral-900 tabular-nums group-hover:underline">
                            {lote.cantidad_actual} {lote.unidad}
                          </span>
                          <div className="w-full mt-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-neutral-300 rounded-full"
                              style={{ width: `${pctUso}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-neutral-400">{pctUso}% consumido</p>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-400 text-xs tabular-nums whitespace-nowrap">
                      {new Date(lote.fecha_ingreso + "T12:00:00").toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleBaja(lote.id, lote.numero_lote)}
                        disabled={pending}
                        className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                        title="Dar de baja"
                      >
                        <PackageX className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
