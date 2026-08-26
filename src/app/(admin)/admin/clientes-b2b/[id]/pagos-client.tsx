"use client";

import { useState, useTransition } from "react";
import { registrarPago, eliminarPago } from "../pagos-actions";

export type Pago = {
  id: string;
  monto: number;
  fecha: string;
  metodo: string;
  referencia: string | null;
  notas: string | null;
  created_at: string;
};

const METODOS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo",      label: "Efectivo" },
  { value: "cheque",        label: "Cheque" },
  { value: "otro",          label: "Otro" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtFecha = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const hoy = () => new Date().toISOString().slice(0, 10);

type Props = {
  clienteId:       string;
  pagos:           Pago[];
  totalFacturado:  number;
};

export function PagosClient({ clienteId, pagos, totalFacturado }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto,       setMonto]       = useState("");
  const [fecha,       setFecha]       = useState(hoy());
  const [metodo,      setMetodo]      = useState("transferencia");
  const [referencia,  setReferencia]  = useState("");
  const [notas,       setNotas]       = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [isPending,   start]          = useTransition();

  const totalPagado  = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldo        = totalFacturado - totalPagado;
  const saldoColor   = saldo <= 0 ? "text-emerald-600" : "text-red-600";

  function reset() {
    setMonto(""); setFecha(hoy()); setMetodo("transferencia");
    setReferencia(""); setNotas(""); setError(null);
    setMostrarForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("monto",      monto);
    fd.set("fecha",      fecha);
    fd.set("metodo",     metodo);
    fd.set("referencia", referencia);
    fd.set("notas",      notas);
    start(async () => {
      const res = await registrarPago(fd);
      if ("error" in res) { setError(res.error); return; }
      reset();
    });
  }

  function handleEliminar(pagoId: string) {
    if (!confirm("¿Eliminar este pago?")) return;
    start(async () => {
      const res = await eliminarPago(pagoId, clienteId);
      if ("error" in res) setError(res.error);
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header con balance */}
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-neutral-700">Cuenta corriente</p>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="text-xs text-neutral-400">
              Facturado: <span className="font-medium text-neutral-700">{fmt(totalFacturado)}</span>
            </span>
            <span className="text-xs text-neutral-400">
              Pagado: <span className="font-medium text-emerald-600">{fmt(totalPagado)}</span>
            </span>
            <span className="text-xs text-neutral-400">
              Saldo: <span className={`font-semibold ${saldoColor}`}>
                {saldo <= 0 ? `${fmt(Math.abs(saldo))} a favor` : fmt(saldo)}
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMostrarForm(v => !v)}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors shrink-0"
        >
          {mostrarForm ? "Cancelar" : "+ Registrar pago"}
        </button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/50 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Monto *</label>
              <input
                type="text" inputMode="decimal" placeholder="0"
                value={monto} onChange={e => setMonto(e.target.value)}
                className={inputCls} disabled={isPending} autoFocus required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Fecha *</label>
              <input
                type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className={inputCls} disabled={isPending} required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Método</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}
                className={inputCls} disabled={isPending}>
                {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Referencia</label>
              <input
                type="text" placeholder="Nro. transferencia, cheque…"
                value={referencia} onChange={e => setReferencia(e.target.value)}
                className={inputCls} disabled={isPending}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Notas (opcional)</label>
            <input
              type="text" placeholder="Observaciones…"
              value={notas} onChange={e => setNotas(e.target.value)}
              className={inputCls} disabled={isPending}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
              {isPending ? "Guardando…" : "Confirmar pago"}
            </button>
            <button type="button" onClick={reset} disabled={isPending}
              className="text-sm text-neutral-400 hover:text-neutral-700 px-2">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Historial de pagos */}
      {pagos.length === 0 ? (
        <p className="px-5 py-8 text-sm text-neutral-400 text-center">
          Sin pagos registrados todavía.
        </p>
      ) : (
        <div className="divide-y divide-neutral-50">
          {pagos.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(Number(p.monto))}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 capitalize">
                    {METODOS.find(m => m.value === p.metodo)?.label ?? p.metodo}
                  </span>
                  <span className="text-xs text-neutral-400">{fmtFecha(p.fecha)}</span>
                  {p.referencia && (
                    <span className="text-xs text-neutral-400 font-mono truncate">{p.referencia}</span>
                  )}
                </div>
                {p.notas && <p className="text-xs text-neutral-400 mt-0.5 truncate">{p.notas}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleEliminar(p.id)}
                disabled={isPending}
                className="text-xs text-neutral-300 hover:text-red-500 disabled:opacity-40 shrink-0 transition-colors"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
