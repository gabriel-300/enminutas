"use client";

import { useState, useTransition } from "react";
import { registrarPago, registrarPagoPedidos, eliminarPago } from "../pagos-actions";

export type Pago = {
  id: string;
  monto: number;
  fecha: string;
  metodo: string;
  referencia: string | null;
  notas: string | null;
  order_id: string | null;
  factura_numero: string | null;
  created_at: string;
  order: { order_number: string; total: number } | null;
};

export type OrdenResumen = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
};

const METODOS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo",      label: "Efectivo" },
  { value: "cheque",        label: "Cheque" },
  { value: "otro",          label: "Otro" },
];

type Imputacion = "pedido" | "factura" | "cuenta";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtFecha = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const hoy = () => new Date().toISOString().slice(0, 10);

const IVA_DIV = 1.21; // mismo criterio que el resto de la app: sin IVA ≈ total / 1.21

type Props = {
  clienteId:      string;
  pagos:          Pago[];
  totalFacturado: number;
  ordenes:        OrdenResumen[];
};

export function PagosClient({ clienteId, pagos, totalFacturado, ordenes }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto,       setMonto]       = useState("");
  const [fecha,       setFecha]       = useState(hoy());
  const [metodo,      setMetodo]      = useState("transferencia");
  const [referencia,  setReferencia]  = useState("");
  const [notas,       setNotas]       = useState("");
  const [imputacion,      setImputacion]     = useState<Imputacion>("pedido");
  const [orderIds,        setOrderIds]       = useState<string[]>([]);
  const [sinFactura,      setSinFactura]     = useState(false);
  const [facturaNum,      setFacturaNum]     = useState("");
  const [marcarLiquidado, setMarcarLiquidado] = useState(false);
  const [error,           setError]          = useState<string | null>(null);
  const [pagosGuardados,  setPagosGuardados] = useState<string[] | null>(null); // pagoIds tras guardar
  const [isPending,       start]             = useTransition();

  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldo       = totalFacturado - totalPagado;

  // Órdenes no canceladas para el selector
  const ordenesActivas = ordenes.filter(o => o.status !== "cancelled" && o.status !== "liquidado");

  function reset() {
    setMonto(""); setFecha(hoy()); setMetodo("transferencia");
    setReferencia(""); setNotas(""); setImputacion("pedido");
    setOrderIds([]); setSinFactura(false); setFacturaNum(""); setMarcarLiquidado(false);
    setError(null); setPagosGuardados(null); setMostrarForm(false);
  }

  // Recalcula el monto sugerido = suma de los pedidos tildados (neto s/IVA si "sin factura")
  function recalcularMonto(ids: string[], sf: boolean) {
    const seleccionadas = ordenesActivas.filter(o => ids.includes(o.id));
    if (seleccionadas.length === 0) { setMonto(""); return; }
    const suma = seleccionadas.reduce((s, o) => s + (sf ? o.total / IVA_DIV : o.total), 0);
    setMonto(String(Math.round(suma)));
  }

  function toggleOrden(id: string) {
    const next = orderIds.includes(id) ? orderIds.filter(x => x !== id) : [...orderIds, id];
    setOrderIds(next);
    recalcularMonto(next, sinFactura);
  }

  function toggleSinFactura(checked: boolean) {
    setSinFactura(checked);
    recalcularMonto(orderIds, checked);
    if (checked) setMarcarLiquidado(true);
  }

  // Reparte el monto ingresado entre los pedidos seleccionados, proporcional a su total
  function distribuirMonto(montoTotal: number, ids: string[]): { orderId: string; monto: number }[] {
    const seleccionadas = ordenesActivas.filter(o => ids.includes(o.id));
    const totalBase = seleccionadas.reduce((s, o) => s + o.total, 0);
    if (totalBase <= 0) return seleccionadas.map(o => ({ orderId: o.id, monto: 0 }));
    let acumulado = 0;
    return seleccionadas.map((o, i) => {
      if (i === seleccionadas.length - 1) {
        return { orderId: o.id, monto: Math.round((montoTotal - acumulado) * 100) / 100 };
      }
      const m = Math.round(montoTotal * (o.total / totalBase) * 100) / 100;
      acumulado += m;
      return { orderId: o.id, monto: m };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (imputacion === "pedido" && orderIds.length === 0)
      return setError("Seleccioná al menos un pedido o cambiá el tipo de imputación.");
    if (imputacion === "factura" && !facturaNum.trim())
      return setError("Ingresá el número de factura.");

    const montoNum = parseFloat(monto.replace(",", "."));
    if (isNaN(montoNum) || montoNum <= 0) return setError("El monto debe ser mayor a cero");

    const notasFinal = sinFactura && imputacion === "pedido"
      ? `${notas ? notas + " · " : ""}Sin factura — cobrado neto s/IVA`
      : notas;

    if (imputacion === "pedido") {
      const items = distribuirMonto(montoNum, orderIds).map(it => ({
        ...it,
        marcarLiquidado,
      }));
      start(async () => {
        const res = await registrarPagoPedidos({
          clienteId: clienteId,
          fecha,
          metodo,
          referencia: referencia.trim() || null,
          notas:      notasFinal?.trim() || null,
          items,
        });
        if ("error" in res) { setError(res.error); return; }
        setPagosGuardados(res.pagoIds);
        setMostrarForm(false);
      });
      return;
    }

    const fd = new FormData();
    fd.set("cliente_id",     clienteId);
    fd.set("monto",          monto);
    fd.set("fecha",          fecha);
    fd.set("metodo",         metodo);
    fd.set("referencia",     referencia);
    fd.set("notas",          notas);
    fd.set("order_id",        "");
    fd.set("factura_numero",  imputacion === "factura" ? facturaNum : "");
    fd.set("marcar_liquidado", "0");

    start(async () => {
      const res = await registrarPago(fd);
      if ("error" in res) { setError(res.error); return; }
      setPagosGuardados([res.pagoId]);
      setMostrarForm(false);
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
  const radioCls = (active: boolean) =>
    `flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer text-center ${
      active
        ? "border-tierra-700 bg-tierra-700/5 text-tierra-700"
        : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
    }`;

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
            <span className="text-xs font-semibold">
              Saldo:{" "}
              <span className={saldo <= 0 ? "text-emerald-600" : "text-red-600"}>
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
        <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/50 space-y-4">

          {/* Imputación */}
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-2">Imputar a</p>
            <div className="flex gap-2">
              <button type="button" className={radioCls(imputacion === "pedido")}
                onClick={() => setImputacion("pedido")}>
                Pedido
              </button>
              <button type="button" className={radioCls(imputacion === "factura")}
                onClick={() => setImputacion("factura")}>
                Factura
              </button>
              <button type="button" className={radioCls(imputacion === "cuenta")}
                onClick={() => setImputacion("cuenta")}>
                A cuenta
              </button>
            </div>
          </div>

          {/* Selector de pedidos (múltiple) */}
          {imputacion === "pedido" && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Pedidos * (podés tildar varios)</label>
              {ordenesActivas.length === 0 ? (
                <p className="text-sm text-neutral-400">Este cliente no tiene pedidos activos.</p>
              ) : (
                <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 max-h-48 overflow-y-auto bg-white">
                  {ordenesActivas.map(o => (
                    <label key={o.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none hover:bg-neutral-50">
                      <input type="checkbox" checked={orderIds.includes(o.id)}
                        onChange={() => toggleOrden(o.id)}
                        disabled={isPending}
                        className="rounded border-neutral-300 text-tierra-700 focus:ring-tierra-700/20 shrink-0" />
                      <span className="text-sm text-neutral-700 flex-1 min-w-0 truncate">
                        {o.order_number} · {fmtFecha(o.created_at)}
                      </span>
                      <span className="text-sm font-medium text-neutral-900 tabular-nums shrink-0">
                        {fmt(sinFactura ? o.total / IVA_DIV : o.total)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {orderIds.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={sinFactura}
                      onChange={e => toggleSinFactura(e.target.checked)}
                      disabled={isPending}
                      className="rounded border-neutral-300 text-tierra-700 focus:ring-tierra-700/20" />
                    <span className="text-sm text-neutral-700">
                      Sin factura — cobrar <strong>neto (s/IVA)</strong>
                    </span>
                  </label>
                  {sinFactura && (
                    <p className="text-xs text-neutral-400 pl-6">
                      El monto se recalcula sin el 21% de IVA — la diferencia queda como descuento, no como saldo pendiente.
                    </p>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={marcarLiquidado}
                      onChange={e => setMarcarLiquidado(e.target.checked)}
                      disabled={isPending}
                      className="rounded border-neutral-300 text-tierra-700 focus:ring-tierra-700/20" />
                    <span className="text-sm text-neutral-700">
                      Marcar {orderIds.length > 1 ? "los pedidos seleccionados" : "el pedido"} como <strong>liquidado</strong>
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Número de factura */}
          {imputacion === "factura" && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Número de factura *</label>
              <input type="text" placeholder="Ej: A-0001-00000123"
                value={facturaNum} onChange={e => setFacturaNum(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
          )}

          {imputacion === "cuenta" && (
            <p className="text-xs text-neutral-400 -mt-1">
              El pago queda registrado en la cuenta del cliente sin asignarse a un pedido o factura específica.
            </p>
          )}

          {/* Datos del pago */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Monto *</label>
              <input type="text" inputMode="decimal" placeholder="0"
                value={monto} onChange={e => setMonto(e.target.value)}
                className={inputCls} disabled={isPending} autoFocus required />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Fecha *</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className={inputCls} disabled={isPending} required />
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
              <input type="text" placeholder="Nro. transferencia…"
                value={referencia} onChange={e => setReferencia(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Notas (opcional)</label>
            <input type="text" placeholder="Observaciones…"
              value={notas} onChange={e => setNotas(e.target.value)}
              className={inputCls} disabled={isPending} />
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

      {/* Banner post-guardado con link(s) al recibo */}
      {pagosGuardados && pagosGuardados.length > 0 && (
        <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-emerald-700 font-medium">
            ✓ {pagosGuardados.length > 1 ? `${pagosGuardados.length} pagos registrados correctamente` : "Pago registrado correctamente"}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {pagosGuardados.map((id, i) => (
              <a key={id} href={`/admin/clientes-b2b/recibo/${id}`} target="_blank"
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-100 transition-colors">
                {pagosGuardados.length > 1 ? `Recibo ${i + 1}` : "Imprimir recibo"}
              </a>
            ))}
            <button type="button" onClick={() => setPagosGuardados(null)}
              className="text-xs text-emerald-400 hover:text-emerald-700">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      {pagos.length === 0 ? (
        <p className="px-5 py-8 text-sm text-neutral-400 text-center">Sin pagos registrados todavía.</p>
      ) : (
        <div className="divide-y divide-neutral-50">
          {pagos.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(Number(p.monto))}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 capitalize">
                    {METODOS.find(m => m.value === p.metodo)?.label ?? p.metodo}
                  </span>
                  <span className="text-xs text-neutral-400">{fmtFecha(p.fecha)}</span>
                  {p.referencia && (
                    <span className="text-xs text-neutral-400 font-mono">{p.referencia}</span>
                  )}
                </div>
                {/* Imputación */}
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  {p.order && p.order_id && (
                    <a href={`/admin/pedidos/${p.order_id}`}
                      className="text-xs text-tierra-700 hover:underline font-mono">
                      {p.order.order_number}
                    </a>
                  )}
                  {p.factura_numero && (
                    <span className="text-xs text-neutral-500 font-mono">
                      Factura {p.factura_numero}
                    </span>
                  )}
                  {!p.order_id && !p.factura_numero && (
                    <span className="text-xs text-neutral-300">A cuenta</span>
                  )}
                  {p.notas && (
                    <span className="text-xs text-neutral-400">· {p.notas}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <a href={`/admin/clientes-b2b/recibo/${p.id}`} target="_blank"
                  className="text-xs text-tierra-700 hover:underline font-medium">
                  Recibo
                </a>
                <button type="button" onClick={() => handleEliminar(p.id)} disabled={isPending}
                  className="text-xs text-neutral-300 hover:text-red-500 disabled:opacity-40 transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
