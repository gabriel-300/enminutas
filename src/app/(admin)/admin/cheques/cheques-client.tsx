"use client";

import { useState, useTransition, useId } from "react";
import { registrarCheque, depositarCheque, acreditarCheque, rechazarCheque } from "./actions";
import { Plus, X } from "lucide-react";

type Cheque = {
  id: string;
  cliente_nombre: string;
  cliente_id: string;
  numero_cheque: string;
  banco: string;
  librador: string | null;
  monto: number;
  fecha_emision: string;
  fecha_acreditacion: string;
  estado: string;
  dias_para_acreditar: number;
};

type Cliente = { id: string; full_name: string };

const ESTADO_CFG: Record<string, { label: string; bg: string; text: string }> = {
  en_cartera: { label: "En cartera",  bg: "#eff6ff", text: "#2563eb" },
  depositado: { label: "Depositado",  bg: "#fffbeb", text: "#b45309" },
  acreditado: { label: "Acreditado", bg: "#ecfdf5", text: "#059669" },
  rechazado:  { label: "Rechazado",  bg: "#fef2f2", text: "#dc2626" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

export function ChequesClient({
  cheques,
  clientes,
  filtro,
}: {
  cheques: Cheque[];
  clientes: Cliente[];
  filtro: string;
}) {
  const formId = useId();
  const [showForm, setShowForm]       = useState(false);
  const [pending, start]              = useTransition();
  const [error, setError]             = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  // Form state
  const [clienteId,   setClienteId]   = useState("");
  const [nroCheque,   setNroCheque]   = useState("");
  const [banco,       setBanco]       = useState("");
  const [librador,    setLibrador]    = useState("");
  const [monto,       setMonto]       = useState("");
  const [fEmision,    setFEmision]    = useState(today());
  const [fAcred,      setFAcred]      = useState("");
  const [obs,         setObs]         = useState("");

  function resetForm() {
    setClienteId(""); setNroCheque(""); setBanco(""); setLibrador("");
    setMonto(""); setFEmision(today()); setFAcred(""); setObs(""); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const montoNum = parseFloat(monto.replace(",", "."));
    if (!montoNum || montoNum <= 0) { setError("Monto inválido"); return; }
    if (!clienteId) { setError("Seleccioná un cliente"); return; }
    setError(null);
    start(async () => {
      const res = await registrarCheque({
        clienteId, numeroCheque: nroCheque, banco, librador: librador || undefined,
        monto: montoNum, fechaEmision: fEmision, fechaAcreditacion: fAcred,
        observaciones: obs || undefined,
      });
      if (res.error) { setError(res.error); return; }
      resetForm(); setShowForm(false);
    });
  }

  function runAction(id: string, fn: () => Promise<{ error?: string }>) {
    start(async () => {
      const res = await fn();
      if (res.error) setActionError(prev => ({ ...prev, [id]: res.error! }));
      else setActionError(prev => { const n = { ...prev }; delete n[id]; return n; });
    });
  }

  const labelClass = "block text-xs font-medium text-neutral-500 mb-1";
  const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]";

  return (
    <div className="space-y-5">
      {/* Botón nuevo */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Cancelar" : "Registrar cheque"}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Nuevo cheque</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-cliente`} className={labelClass}>Cliente *</label>
                <select id={`${formId}-cliente`} value={clienteId} onChange={e => setClienteId(e.target.value)} className={inputClass} required>
                  <option value="">Seleccioná...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${formId}-nro`} className={labelClass}>N° cheque *</label>
                <input id={`${formId}-nro`} type="text" placeholder="00000000" value={nroCheque} onChange={e => setNroCheque(e.target.value)} className={inputClass} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-banco`} className={labelClass}>Banco *</label>
                <input id={`${formId}-banco`} type="text" placeholder="Ej: Galicia, Nación..." value={banco} onChange={e => setBanco(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor={`${formId}-librador`} className={labelClass}>Librador</label>
                <input id={`${formId}-librador`} type="text" placeholder="Nombre del firmante" value={librador} onChange={e => setLibrador(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor={`${formId}-monto`} className={labelClass}>Monto ($) *</label>
                <input id={`${formId}-monto`} type="number" min="0.01" step="0.01" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor={`${formId}-fem`} className={labelClass}>Fecha emisión</label>
                <input id={`${formId}-fem`} type="date" value={fEmision} onChange={e => setFEmision(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${formId}-facred`} className={labelClass}>Fecha acreditación *</label>
                <input id={`${formId}-facred`} type="date" value={fAcred} onChange={e => setFAcred(e.target.value)} className={inputClass} required />
              </div>
            </div>
            <div>
              <label htmlFor={`${formId}-obs`} className={labelClass}>Observaciones</label>
              <input id={`${formId}-obs`} type="text" placeholder="Notas..." value={obs} onChange={e => setObs(e.target.value)} className={inputClass} />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={pending} className="w-full py-2.5 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50">
              {pending ? "Guardando..." : "Registrar cheque"}
            </button>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {cheques.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">
            {filtro === "todos" ? "No hay cheques registrados." : "No hay cheques en este estado."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cliente / Banco</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">N° Cheque</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Acreditación</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Monto</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {cheques.map(ch => {
                const cfg      = ESTADO_CFG[ch.estado] ?? ESTADO_CFG.en_cartera;
                const urgente  = ch.dias_para_acreditar >= 0 && ch.dias_para_acreditar <= 3 && ch.estado !== "acreditado";
                const vencido  = ch.dias_para_acreditar < 0 && ch.estado === "en_cartera";
                return (
                  <tr key={ch.id} className={`hover:bg-neutral-50 transition-colors ${urgente || vencido ? "bg-amber-50/40" : ""}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-neutral-900">{ch.cliente_nombre}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{ch.banco}{ch.librador ? ` · ${ch.librador}` : ""}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-neutral-700">{ch.numero_cheque}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: cfg.bg, color: cfg.text }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="text-neutral-700 tabular-nums whitespace-nowrap">
                        {new Date(ch.fecha_acreditacion + "T12:00:00").toLocaleDateString("es-AR")}
                      </p>
                      {ch.estado !== "acreditado" && ch.estado !== "rechazado" && (
                        <p className={`text-xs mt-0.5 ${urgente ? "text-orange-600 font-semibold" : vencido ? "text-red-600 font-semibold" : "text-neutral-400"}`}>
                          {ch.dias_para_acreditar < 0
                            ? `vencido hace ${Math.abs(ch.dias_para_acreditar)}d`
                            : ch.dias_para_acreditar === 0
                            ? "hoy"
                            : `en ${ch.dias_para_acreditar}d`}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-neutral-900 tabular-nums">
                      {fmt(ch.monto)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ch.estado === "en_cartera" && (
                          <button onClick={() => runAction(ch.id, () => depositarCheque(ch.id))} disabled={pending}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors disabled:opacity-50">
                            Depositar
                          </button>
                        )}
                        {(ch.estado === "en_cartera" || ch.estado === "depositado") && (
                          <>
                            <button onClick={() => runAction(ch.id, () => acreditarCheque(ch.id))} disabled={pending}
                              className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors disabled:opacity-50">
                              Acreditar
                            </button>
                            <button onClick={() => {
                              if (!confirm("¿Marcar cheque como rechazado?")) return;
                              runAction(ch.id, () => rechazarCheque(ch.id));
                            }} disabled={pending}
                              className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50">
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>
                      {actionError[ch.id] && <p className="text-xs text-red-600 mt-1">{actionError[ch.id]}</p>}
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
