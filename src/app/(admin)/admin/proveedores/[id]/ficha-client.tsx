"use client";

import { fmt } from "@/lib/format";
import { fmtFechaSolo } from "@/lib/fecha";
import { estadoVencimiento, etiquetaComprobante, parseMontoAR } from "@/lib/proveedores";
import { useState, useTransition } from "react";
import {
  crearOrdenPago, aprobarOrdenPago, pagarOrdenPago, anularOrdenPago,
  eliminarPagoProveedor, setGeneraDeuda, setVencimientoPago, vincularRemitos, desvincularRemito,
} from "../actions";
import { compararRemitosConFactura } from "@/lib/remitos";
import { ESTADO_ORDEN_PAGO, type EstadoOrdenPago } from "@/lib/proveedores-ficha";

export type OrdenPendiente = {
  id:         string;
  monto:      number;
  fecha:      string;
  metodo:     string;
  referencia: string | null;
  notas:      string | null;
  estado:     EstadoOrdenPago;
  aprobadoAt: string | null;
};

export type Comprobante = {
  id:          string;
  tipo:        string;
  categoria:   string | null;
  numero:      string;
  fecha:       string;
  vencimiento: string;
  total:       number;
  neto:         number | null;
  iva:          number | null;
  percepciones: number | null;
  pagado:      number;
  saldo:       number;
  generaDeuda: boolean;
  /** Solo en remitos: la factura que lo incluye. */
  facturaId:     string | null;
  facturaNumero: string | null;
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
  proveedorId, hoy, comprobantes, pagos, ordenes,
}: {
  proveedorId:  string;
  hoy:          string;
  comprobantes: Comprobante[];
  pagos:        PagoGrupo[];
  ordenes:      OrdenPendiente[];
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
  const [errorOrden,  setErrorOrden]  = useState<string | null>(null);
  const [pending,     start]          = useTransition();
  // Vincular remitos a una factura: id de la factura abierta, remitos tildados y mensajes.
  const [vinculando,      setVinculando]      = useState<string | null>(null);
  const [remitosElegidos, setRemitosElegidos] = useState<string[]>([]);
  const [errorVinculo,    setErrorVinculo]    = useState<string | null>(null);
  const [avisoVinculo,    setAvisoVinculo]    = useState<string | null>(null);

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
    const montoNum = parseMontoAR(monto);
    if (montoNum == null || montoNum <= 0) return setError("El monto debe ser mayor a cero");
    start(async () => {
      const res = await crearOrdenPago({
        proveedorId, monto: montoNum, fecha, metodo, referencia, notas, recepcionIds: elegidos,
      });
      if ("error" in res) { setError(res.error); return; }
      setGuardado({ grupoId: res.ordenId, aCuenta: res.aCuenta });
      reset();
    });
  }

  // Aprobar, pagar o anular una orden. Cada paso lo hace un click explícito.
  function avanzarOrden(o: OrdenPendiente, accion: "aprobar" | "pagar" | "anular") {
    if (accion === "pagar" && !confirm(`¿Registrar el pago de ${fmt(o.monto)}? Desde este momento baja la deuda con el proveedor.`)) return;
    if (accion === "anular" && !confirm("¿Descartar esta orden de pago?")) return;
    setErrorOrden(null);
    start(async () => {
      const res = accion === "aprobar" ? await aprobarOrdenPago(o.id, proveedorId)
        : accion === "pagar" ? await pagarOrdenPago(o.id, proveedorId)
        : await anularOrdenPago(o.id, proveedorId);
      if ("error" in res) setErrorOrden(res.error);
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

  // Remitos que todavía cuentan como deuda propia y se pueden vincular (sin pagos imputados).
  const remitosLibres = comprobantes.filter(c => c.tipo === "remito" && c.generaDeuda && !c.facturaId && c.pagado === 0);
  const remitosDe = (facturaId: string) => comprobantes.filter(c => c.facturaId === facturaId);
  const facturaVinculando = comprobantes.find(c => c.id === vinculando) ?? null;

  function abrirVinculo(factura: Comprobante) {
    setVinculando(factura.id); setRemitosElegidos([]); setErrorVinculo(null); setAvisoVinculo(null);
  }
  function cerrarVinculo() { setVinculando(null); setRemitosElegidos([]); setErrorVinculo(null); }
  function toggleRemito(id: string) {
    setRemitosElegidos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function confirmarVinculo() {
    if (!facturaVinculando) return;
    setErrorVinculo(null);
    start(async () => {
      const res = await vincularRemitos(facturaVinculando.id, remitosElegidos, proveedorId);
      if ("error" in res) { setErrorVinculo(res.error); return; }
      setAvisoVinculo(Math.abs(res.diferencia) > 1
        ? `Vinculado. La factura y sus remitos difieren en ${fmt(Math.abs(res.diferencia))} (${res.diferencia > 0 ? "la factura trae más" : "los remitos suman más"}).`
        : "Vinculado: la factura y sus remitos coinciden.");
      cerrarVinculo();
    });
  }
  function quitarVinculo(c: Comprobante) {
    if (!confirm(`¿Desvincular el remito ${c.numero}? Vuelve a generar deuda por su cuenta: si la factura sigue cargada, se contará dos veces.`)) return;
    setError(null);
    start(async () => {
      const res = await desvincularRemito(c.id, proveedorId);
      if ("error" in res) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {error && !mostrarForm && <p className="text-sm text-danger">{error}</p>}

      {/* Registrar pago */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-semibold text-neutral-700">Pagos al proveedor</p>
          <button type="button" onClick={() => (mostrarForm ? reset() : setMostrarForm(true))} disabled={pending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
            {mostrarForm ? "Cancelar" : "+ Nueva orden de pago"}
          </button>
        </div>

        {/* Órdenes de pago sin pagar: borrador → aprobada → pagada */}
        {ordenes.length > 0 && (
          <div className="border-t border-neutral-100 divide-y divide-neutral-50">
            <p className="px-5 pt-3 pb-1 text-xs font-semibold text-neutral-600 uppercase tracking-wide">Órdenes de pago pendientes</p>
            {errorOrden && <p className="px-5 py-2 text-sm text-danger">{errorOrden}</p>}
            {ordenes.map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold tabular-nums">{fmt(o.monto)}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${o.estado === "aprobada" ? "bg-success-bg text-success" : "bg-warning-bg text-warning"}`}>
                      {ESTADO_ORDEN_PAGO[o.estado]}
                    </span>
                    <span className="text-xs text-neutral-600">{fmtFechaSolo(o.fecha)}</span>
                    {o.referencia && <span className="text-xs text-neutral-600 font-mono">{o.referencia}</span>}
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {o.estado === "borrador" ? "Falta la aprobación antes de pagar" : "Aprobada: lista para pagar"}
                    {o.notas && ` — ${o.notas}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a href={`/admin/proveedores/orden-pago/${o.id}`} target="_blank" className="text-xs text-tierra-700 hover:underline font-medium">Ver / imprimir</a>
                  {o.estado === "borrador" && (
                    <button type="button" disabled={pending} onClick={() => avanzarOrden(o, "aprobar")}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50">Aprobar</button>
                  )}
                  {o.estado === "aprobada" && (
                    <button type="button" disabled={pending} onClick={() => avanzarOrden(o, "pagar")}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success text-white disabled:opacity-50">Registrar pago</button>
                  )}
                  <button type="button" disabled={pending} onClick={() => avanzarOrden(o, "anular")}
                    className="text-xs text-neutral-500 hover:text-danger disabled:opacity-40">Descartar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {guardado && (
          <div className="px-5 py-3 bg-success-bg border-t border-success-border flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-success font-medium">
              ✓ Orden de pago creada en borrador{guardado.aCuenta > 0 ? ` (${fmt(guardado.aCuenta)} quedarían a cuenta)` : ""}. Falta aprobarla y registrar el pago.
            </p>
            <div className="flex items-center gap-3">
              <a href={`/admin/proveedores/orden-pago/${guardado.grupoId}`} target="_blank"
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-success-border text-success hover:bg-success-bg transition-colors">
                Ver orden
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
              La orden se crea en borrador: no baja la deuda hasta que se apruebe y se registre el pago.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
                {pending ? "Guardando…" : "Crear orden (borrador)"}
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
            Cuando llega la factura de un remito, usá «Vincular remitos» en la factura: la deuda pasa a la factura y el remito no se cuenta dos veces.
            Destildá «Genera deuda» solo en una compra ya pagada.
            {sinDeuda > 0 && ` Hay ${sinDeuda} sin deuda, incluido el historial anterior al módulo.`}
          </p>
          {avisoVinculo && <p className="text-xs text-success font-medium mt-2">✓ {avisoVinculo}</p>}
        </div>

        {facturaVinculando && (() => {
          const ya = remitosDe(facturaVinculando.id);
          const elegidos = remitosLibres.filter(r => remitosElegidos.includes(r.id));
          const cmp = compararRemitosConFactura([...ya, ...elegidos].map(r => r.total), { neto: facturaVinculando.neto, total: facturaVinculando.total });
          return (
            <div className="px-5 py-4 border-y border-neutral-100 bg-neutral-50/50 space-y-3">
              <p className="text-sm font-semibold text-neutral-800">
                Vincular remitos a la Factura {facturaVinculando.numero}
                <span className="font-normal text-neutral-600"> · neto {fmt(facturaVinculando.neto ?? facturaVinculando.total)} · total {fmt(facturaVinculando.total)}</span>
              </p>
              <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 max-h-56 overflow-y-auto bg-white">
                {remitosLibres.map(r => (
                  <label key={r.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none hover:bg-neutral-50">
                    <input type="checkbox" checked={remitosElegidos.includes(r.id)} onChange={() => toggleRemito(r.id)}
                      disabled={pending} className="rounded border-neutral-300 text-tierra-700 shrink-0" />
                    <span className="text-sm text-neutral-700 flex-1 min-w-0 truncate">Remito {r.numero} · {fmtFechaSolo(r.fecha)}</span>
                    <span className="text-sm font-medium text-neutral-900 tabular-nums shrink-0">{fmt(r.total)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-neutral-600">
                Remitos {ya.length + elegidos.length} · suman {fmt(cmp.suma)} · factura {fmt(cmp.base)} ·{" "}
                {Math.abs(cmp.diferencia) <= 1
                  ? <span className="text-success font-medium">coinciden</span>
                  : <span className="text-warning font-medium">diferencia {fmt(Math.abs(cmp.diferencia))} ({cmp.diferencia > 0 ? "la factura trae más" : "los remitos suman más"})</span>}
                . Los remitos vinculados dejan de generar deuda: queda la de la factura.
              </p>
              {errorVinculo && <p className="text-sm text-danger">{errorVinculo}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={confirmarVinculo} disabled={pending || elegidos.length === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
                  {pending ? "Vinculando…" : `Vincular ${elegidos.length || ""} remito${elegidos.length === 1 ? "" : "s"}`}
                </button>
                <button type="button" onClick={cerrarVinculo} disabled={pending} className="text-sm text-neutral-600 hover:text-neutral-700 px-2">Cancelar</button>
              </div>
            </div>
          );
        })()}
        <table className="w-full text-sm">
          <thead className="border-y border-neutral-100">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Comprobante</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Fecha</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Vence</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Neto</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">IVA</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Percep.</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Total</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Pagado</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Saldo</th>
              <th className="px-5 py-2.5 text-center text-xs font-semibold text-neutral-600">Genera deuda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {comprobantes.length === 0 && (
              <tr><td colSpan={10}className="px-5 py-8 text-center text-sm text-neutral-600">Sin comprobantes cargados.</td></tr>
            )}
            {comprobantes.map(c => {
              const est = c.generaDeuda && c.saldo > 0.5 ? estadoVencimiento(c.vencimiento, hoy) : null;
              return (
                <tr key={c.id} className={c.generaDeuda ? "" : "text-neutral-500"}>
                  <td className="px-5 py-3">
                    <span className="font-medium">{etiquetaComprobante(c.tipo, c.categoria)} {c.numero}</span>
                    {c.tipo === "remito" && c.facturaId && (
                      <span className="block text-[11px] text-neutral-500">
                        En la factura {c.facturaNumero ?? ""} ·{" "}
                        <button type="button" onClick={() => quitarVinculo(c)} disabled={pending} className="text-tierra-700 hover:underline disabled:opacity-40">Desvincular</button>
                      </span>
                    )}
                    {c.tipo === "factura" && remitosDe(c.id).length > 0 && (
                      <span className="block text-[11px] text-neutral-500">
                        Incluye {remitosDe(c.id).length} remito{remitosDe(c.id).length === 1 ? "" : "s"} ({fmt(remitosDe(c.id).reduce((s, r) => s + r.total, 0))})
                      </span>
                    )}
                    {c.tipo === "factura" && c.generaDeuda && remitosLibres.length > 0 && vinculando !== c.id && (
                      <button type="button" onClick={() => abrirVinculo(c)} disabled={pending}
                        className="block text-[11px] text-tierra-700 hover:underline disabled:opacity-40">Vincular remitos</button>
                    )}
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
                  <td className="px-5 py-3 text-right tabular-nums">{c.neto == null ? "—" : fmt(c.neto)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.iva == null ? "—" : fmt(c.iva)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.percepciones == null ? "—" : fmt(c.percepciones)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmt(c.total)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.pagado > 0 ? fmt(c.pagado) : "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">{c.generaDeuda ? fmt(c.saldo) : "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <input type="checkbox" checked={c.generaDeuda} disabled={pending || !!c.facturaId}
                      title={c.facturaId ? "Vinculado a una factura: desvinculalo para que vuelva a generar deuda" : undefined}
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
