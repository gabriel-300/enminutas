"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearAjusteInterno, aprobarAjusteInterno, rechazarAjusteInterno, informeAjustesMes,
  type AjusteRow, type TipoAjuste, type InformeAjustesMes,
} from "@/app/(admin)/admin/ajustes-internos/actions";

type Persona = { id: string; nombre: string };

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtFecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR");

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50";

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  "bg-warning-bg text-warning border border-warning-border",
  aprobado:   "bg-success-bg text-success border border-success-border",
  rechazado:  "bg-danger-bg text-danger border border-danger-border",
};

const FORM_VACIO = { tipo: "debito" as TipoAjuste, destino: "cliente" as "cliente" | "proveedor", clienteId: "", proveedorId: "", referencia: "", monto: "", motivo: "" };

export function AjustesInternosClient({
  clientes, proveedores, ajustesIniciales,
}: {
  clientes:          Persona[];
  proveedores:       Persona[];
  ajustesIniciales:  AjusteRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ajustes, setAjustes] = useState(ajustesIniciales);
  const [filtroEstado, setFiltroEstado] = useState<string>("pendiente");

  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [informe, setInforme] = useState<InformeAjustesMes | null>(null);
  const [cargandoInforme, setCargandoInforme] = useState(false);

  function campo(k: keyof typeof FORM_VACIO, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function crear() {
    setError(null); setOk(false);
    const monto = parseFloat(form.monto.replace(",", "."));
    if (!Number.isFinite(monto) || monto <= 0) { setError("El monto debe ser mayor a cero"); return; }
    if (!form.motivo.trim()) { setError("El motivo es obligatorio"); return; }
    if (form.destino === "cliente" && !form.clienteId) { setError("Elegí un cliente"); return; }
    if (form.destino === "proveedor" && !form.proveedorId) { setError("Elegí un proveedor"); return; }

    startTransition(async () => {
      const res = await crearAjusteInterno({
        tipo:        form.tipo,
        clienteId:   form.destino === "cliente" ? form.clienteId : null,
        proveedorId: form.destino === "proveedor" ? form.proveedorId : null,
        referencia:  form.referencia || null,
        monto,
        motivo:      form.motivo,
      });
      if ("error" in res) { setError(res.error); return; }
      setOk(true);
      setForm(FORM_VACIO);
      router.refresh();
    });
  }

  function aprobar(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await aprobarAjusteInterno(id);
      if ("error" in res) { setError(res.error); return; }
      router.refresh();
    });
  }

  function rechazar(id: string) {
    if (!confirm("¿Rechazar este ajuste? No va a afectar la deuda.")) return;
    setError(null);
    startTransition(async () => {
      const res = await rechazarAjusteInterno(id);
      if ("error" in res) { setError(res.error); return; }
      router.refresh();
    });
  }

  function cargarInforme() {
    setCargandoInforme(true);
    startTransition(async () => {
      const r = await informeAjustesMes(mes);
      setInforme(r);
      setCargandoInforme(false);
    });
  }

  const visibles = ajustes.filter((a) => filtroEstado === "todos" || a.estado === filtroEstado);

  return (
    <div className="space-y-6">
      {/* ── Nuevo ajuste ── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4">
        <p className="text-sm font-semibold text-neutral-700">Nuevo ajuste</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-neutral-600 mb-1">Tipo *</span>
            <select className={inputCls} value={form.tipo} onChange={(e) => campo("tipo", e.target.value)} disabled={isPending}>
              <option value="debito">DRI — débito interno (aumenta la deuda)</option>
              <option value="credito">CRI — crédito interno (reduce la deuda)</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-neutral-600 mb-1">Corrige a *</span>
            <select className={inputCls} value={form.destino}
              onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value as "cliente" | "proveedor", clienteId: "", proveedorId: "" }))}
              disabled={isPending}>
              <option value="cliente">Cliente</option>
              <option value="proveedor">Proveedor</option>
            </select>
          </label>
          {form.destino === "cliente" ? (
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-neutral-600 mb-1">Cliente *</span>
              <select className={inputCls} value={form.clienteId} onChange={(e) => campo("clienteId", e.target.value)} disabled={isPending}>
                <option value="">— Seleccionar —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
          ) : (
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-neutral-600 mb-1">Proveedor *</span>
              <select className={inputCls} value={form.proveedorId} onChange={(e) => campo("proveedorId", e.target.value)} disabled={isPending}>
                <option value="">— Seleccionar —</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="block text-xs font-medium text-neutral-600 mb-1">Monto *</span>
            <input className={inputCls} inputMode="decimal" placeholder="0" value={form.monto} onChange={(e) => campo("monto", e.target.value)} disabled={isPending} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-neutral-600 mb-1">Referencia (pedido, cobro, comprobante…)</span>
            <input className={inputCls} placeholder="ej. Pedido 0231, cobro Petri 06/11" value={form.referencia} onChange={(e) => campo("referencia", e.target.value)} disabled={isPending} />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-neutral-600 mb-1">Motivo *</span>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Por qué se corrige, qué pasó con el registro original" value={form.motivo} onChange={(e) => campo("motivo", e.target.value)} disabled={isPending} />
          </label>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {ok && <p className="text-sm text-success">Ajuste cargado, queda pendiente de aprobación.</p>}
        <button type="button" onClick={crear} disabled={isPending}
          className="px-4 py-2 rounded-lg bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : "Cargar ajuste"}
        </button>
      </div>

      {/* ── Listado ── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-neutral-700">Ajustes cargados</p>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-400 rounded-lg bg-white">
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        {visibles.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-600">No hay ajustes en este filtro.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {visibles.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${a.tipo === "debito" ? "bg-danger-bg text-danger border border-danger-border" : "bg-success-bg text-success border border-success-border"}`}>
                  {a.tipo === "debito" ? "DRI" : "CRI"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">
                    {a.clienteNombre ?? a.proveedorNombre ?? "—"}
                    {a.referencia && <span className="text-neutral-500 font-normal"> · {a.referencia}</span>}
                  </p>
                  <p className="text-xs text-neutral-600 truncate">{a.motivo}</p>
                </div>
                <span className="text-sm font-semibold text-neutral-800 tabular-nums shrink-0">{fmtARS(a.monto)}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ESTADO_BADGE[a.estado]}`}>{a.estado}</span>
                <span className="text-xs text-neutral-500 shrink-0">{fmtFecha(a.createdAt)} · {a.creadoPorNombre ?? "—"}</span>
                {a.estado === "pendiente" && (
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => aprobar(a.id)} disabled={isPending}
                      className="text-xs text-success hover:underline disabled:opacity-40">Aprobar</button>
                    <button type="button" onClick={() => rechazar(a.id)} disabled={isPending}
                      className="text-xs text-danger hover:underline disabled:opacity-40">Rechazar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Informe mensual ── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold text-neutral-700">Informe mensual (solo aprobados)</p>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
            className="px-3 py-1.5 text-sm border border-neutral-400 rounded-lg bg-white" />
          <button type="button" onClick={cargarInforme} disabled={cargandoInforme}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            {cargandoInforme ? "Calculando…" : "Ver informe"}
          </button>
        </div>
        {informe && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-neutral-600 mb-2">Por motivo</p>
              {informe.porMotivo.length === 0
                ? <p className="text-sm text-neutral-500">Sin ajustes aprobados este mes.</p>
                : (
                  <div className="space-y-1">
                    {informe.porMotivo.map((m) => (
                      <div key={m.motivo} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-neutral-700 truncate">{m.motivo} <span className="text-neutral-500">×{m.cantidad}</span></span>
                        <span className="font-medium tabular-nums shrink-0">{fmtARS(m.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-600 mb-2">Por persona</p>
              {informe.porPersona.length === 0
                ? <p className="text-sm text-neutral-500">Sin ajustes aprobados este mes.</p>
                : (
                  <div className="space-y-1">
                    {informe.porPersona.map((p) => (
                      <div key={p.nombre} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-neutral-700 truncate">{p.nombre} <span className="text-neutral-500">×{p.cantidad}</span></span>
                        <span className="font-medium tabular-nums shrink-0">{fmtARS(p.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
