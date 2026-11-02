"use client";

import { fmt } from "@/lib/format";
import { fmtFechaSolo } from "@/lib/fecha";
import { estadoVencimiento, etiquetaComprobante } from "@/lib/proveedores";
import { useState, useTransition } from "react";
import { registrarPagoProveedor, eliminarPagoProveedor, setGeneraDeuda, setVencimientoPago } from "../actions";

export type Comprobante = {
  id:          string;
  tipo:        string;
  categoria:   string | null;
  numero:      string;
  fecha:       string;
  vencimiento: string;
  total:       number;
  pagado:      number;
  saldo:       number;
  generaDeuda: boolean;
};

export type PagoGrupo = {
  grupoId:    string;
  fecha:      string;
  metodo:     string;
  referencia: string | null;
  notas:      string | null;
  monto:      number;
  destinos:   string[];
};

const METODOS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo",      label: "Efectivo" },
  { value: "cheque",        label: "Cheque" },
  { value: "otro",          label: "Otro" },
];

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50";
const labelCls = "block text-[13px] font-medium text-neutral-800 mb-1.5";

const ESTADO_CLS = {
  vencida:    "bg-danger-bg text-danger",
  por_vencer: "bg-warning-bg text-warning",
  al_dia:     "bg-neutral-100 text-neutral-600",
} as const;
const ESTADO_TXT = { vencida: "Vencida", por_vencer: "Por vencer", al_dia: "Al día" } as const;

export function FichaClient({
  proveedorId, hoy, comprobantes, pagos,
}: {
  proveedorId:  string;
  hoy:          string;
  comprobantes: Comprobante[];
  pagos:        PagoGrupo[];
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [elegidos,    setElegidos]    = useState<string[]>([]);
  const [monto,       setMonto]       = useState("");
  const [fecha,       setFecha]       = useState(hoy);
  const [metodo,      setMetodo]      = useState("transferencia");
  const [referencia,  setReferencia]  = useState("");
  const [notas,       setNotas]       = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [guardado,    setGuardado]    = useState<{ grupoId: string; aCuenta: number } | null>(null);
  const [pending,     start]          = useTransition();

  // Pendientes por vencimiento: se paga primero lo que antes vence.
  const pendientes = comprobantes
    .filter(c => c.generaDeuda && c.saldo > 0.5)
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  function reset() {
    setElegidos([]); setMonto(""); setFecha(hoy); setMetodo("transferencia");
    setReferencia(""); setNotas(""); setError(null); setMostrarForm(false);
  }

  function toggle(id: string) {
    const next = elegidos.includes(id) ? elegidos.filter(x => x !== id) : [...elegidos, id];
    setElegidos(next);
    const suma = pendientes.filter(c => next.includes(c.id)).reduce((s, c) => s + c.saldo, 0);
    setMonto(suma > 0 ? String(Math.round(suma * 100) / 100) : "");
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = parseFloat(monto.replace(",", "."));
    if (isNaN(montoNum) || montoNum <= 0) return setError("El monto debe ser mayor a cero");
    start(async () => {
      const res = await registrarPagoProveedor({
        proveedorId, monto: montoNum, fecha, metodo, referencia, notas, recepcionIds: elegidos,
      });
      if ("error" in res) { setError(res.error); return; }
      setGuardado({ grupoId: res.grupoId, aCuenta: res.aCuenta });
      reset();
    });
  }

  function eliminar(grupoId: string) {
    if (!confirm("¿Eliminar este pago? Las facturas vuelven a quedar con saldo pendiente.")) return;
    start(async () => {
      const res = await eliminarPagoProveedor(grupoId, proveedorId);
      if ("error" in res) setError(res.error);
    });
  }

  function cambiarGeneraDeuda(c: Comprobante, valor: boolean) {
    setError(null);
    start(async () => {
      const res = await setGeneraDeuda(c.id, valor, proveedorId);
      if ("error" in res) setError(res.error);
    });
  }

  function cambiarVencimiento(c: Comprobante, valor: string) {
    if (!valor || valor === c.vencimiento) return;
    start(async () => {
      const res = await setVencimientoPago(c.id, valor, proveedorId);
      if ("error" in res) setError(res.error);
    });
  }

  const sinDeuda = comprobantes.filter(c => !c.generaDeuda).length;

  return (
    <div className="space-y-6">
      {error && !mostrarForm && <p className="text-sm text-danger">{error}</p>}

      {/* Registrar pago */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-semibold text-neutral-700">Pagos al proveedor</p>
          <button type="button" onClick={() => (mostrarForm ? reset() : setMostrarForm(true))} disabled={pending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
            {mostrarForm ? "Cancelar" : "+ Registrar pago"}
          </button>
        </div>

        {guardado && (
          <div className="px-5 py-3 bg-success-bg border-t border-success-border flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-success font-medium">
              ✓ Pago registrado{guardado.aCuenta > 0 ? ` (${fmt(guardado.aCuenta)} quedaron a cuenta)` : ""}
            </p>
            <div className="flex items-center gap-3">
              <a href={`/admin/proveedores/orden-pago/${guardado.grupoId}`} target="_blank"
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-success-border text-success hover:bg-success-bg transition-colors">
                Imprimir orden de pago
              </a>
              <button type="button" onClick={() => setGuardado(null)} className="text-xs text-success">✕</button>
            </div>
          </div>
        )}

        {mostrarForm && (
          <form onSubmit={guardar} className="px-5 py-4 border-t border-neutral-100 bg-neutral-50/50 space-y-4">
            <div>
              <label className={labelCls}>Comprobantes a pagar (podés tildar varios; si no tildás ninguno queda a cuenta)</label>
              {pendientes.length === 0 ? (
                <p className="text-sm text-neutral-600">No hay facturas ni remitos con saldo pendiente.</p>
              ) : (
                <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 max-h-56 overflow-y-auto bg-white">
                  {pendientes.map(c => {
                    const est = estadoVencimiento(c.vencimiento, hoy);
                    return (
                      <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none hover:bg-neutral-50">
                        <input type="checkbox" checked={elegidos.includes(c.id)} onChange={() => toggle(c.id)}
                          disabled={pending} className="rounded border-neutral-300 text-tierra-700 shrink-0" />
                        <span className="text-sm text-neutral-700 flex-1 min-w-0 truncate">
                          {etiquetaComprobante(c.tipo, c.categoria)} {c.numero} · vence {fmtFechaSolo(c.vencimiento)}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${ESTADO_CLS[est]}`}>{ESTADO_TXT[est]}</span>
                        <span className="text-sm font-medium text-neutral-900 tabular-nums shrink-0">{fmt(c.saldo)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Monto *</label>
                <input type="text" inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)}
                  className={inputCls} disabled={pending} required placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Fecha *</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} disabled={pending} required />
              </div>
              <div>
                <label className={labelCls}>Método</label>
                <select value={metodo} onChange={e => setMetodo(e.target.value)} className={inputCls} disabled={pending}>
                  {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Referencia</label>
                <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
                  placeholder="Nro. transferencia…" className={inputCls} disabled={pending} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input type="text" value={notas} onChange={e => setNotas(e.target.value)} className={inputCls} disabled={pending} />
            </div>
            <p className="text-xs text-neutral-600">
              El monto se reparte entre los comprobantes tildados, el que vence primero antes. Si sobra, queda a cuenta.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
                {pending ? "Guardando…" : "Confirmar pago"}
              </button>
              <button type="button" onClick={reset} disabled={pending} className="text-sm text-neutral-600 hover:text-neutral-700 px-2">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Historial de pagos */}
        {pagos.length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-600 text-center border-t border-neutral-100">Sin pagos registrados todavía.</p>
        ) : (
          <div className="divide-y divide-neutral-50 border-t border-neutral-100">
            {pagos.map(p => (
              <div key={p.grupoId} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(p.monto)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {METODOS.find(m => m.value === p.metodo)?.label ?? p.metodo}
                    </span>
                    <span className="text-xs text-neutral-600">{fmtFechaSolo(p.fecha)}</span>
                    {p.referencia && <span className="text-xs text-neutral-600 font-mono">{p.referencia}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    {p.destinos.join(" · ")}{p.notas && ` — ${p.notas}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <a href={`/admin/proveedores/orden-pago/${p.grupoId}`} target="_blank"
                    className="text-xs text-tierra-700 hover:underline font-medium">Orden de pago</a>
                  <button type="button" onClick={() => eliminar(p.grupoId)} disabled={pending}
                    className="text-xs text-neutral-500 hover:text-danger disabled:opacity-40 transition-colors">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comprobantes */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-neutral-700">Facturas, remitos y gastos</p>
          <p className="text-xs text-neutral-600 mt-0.5">
            Destildá «Genera deuda» en un remito que después se facturó (para no contarlo dos veces) o en una compra ya pagada.
            {sinDeuda > 0 && ` Hay ${sinDeuda} sin deuda, incluido el historial anterior al módulo.`}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-y border-neutral-100">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Comprobante</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Fecha</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Vence</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Total</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Pagado</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Saldo</th>
              <th className="px-5 py-2.5 text-center text-xs font-semibold text-neutral-600">Genera deuda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {comprobantes.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-neutral-600">Sin comprobantes cargados.</td></tr>
            )}
            {comprobantes.map(c => {
              const est = c.generaDeuda && c.saldo > 0.5 ? estadoVencimiento(c.vencimiento, hoy) : null;
              return (
                <tr key={c.id} className={c.generaDeuda ? "" : "text-neutral-500"}>
                  <td className="px-5 py-3">
                    <span className="font-medium">{etiquetaComprobante(c.tipo, c.categoria)} {c.numero}</span>
                  </td>
                  <td className="px-5 py-3 tabular-nums">{fmtFechaSolo(c.fecha)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <input type="date" defaultValue={c.vencimiento} disabled={pending || !c.generaDeuda}
                        onBlur={e => cambiarVencimiento(c, e.target.value)}
                        className="px-2 py-1 text-xs border border-neutral-300 rounded-md disabled:opacity-50" />
                      {est && <span className={`text-[11px] px-2 py-0.5 rounded-full ${ESTADO_CLS[est]}`}>{ESTADO_TXT[est]}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmt(c.total)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.pagado > 0 ? fmt(c.pagado) : "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">{c.generaDeuda ? fmt(c.saldo) : "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <input type="checkbox" checked={c.generaDeuda} disabled={pending}
                      onChange={e => cambiarGeneraDeuda(c, e.target.checked)}
                      className="rounded border-neutral-300 text-tierra-700" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
