"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, FileText, ClipboardList } from "lucide-react";
import { registrarRecepcion, type InsumoBasico, type RecepcionHistorial } from "./actions";

const fmtPrecio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(n);

const fmtFecha = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

const hoy = () => new Date().toISOString().slice(0, 10);

const IVA_OPCIONES = [
  { label: "0%  (en negro / exento)", value: 0 },
  { label: "10.5% (IVA reducido)",    value: 10.5 },
  { label: "21%  (IVA general)",      value: 21 },
];

type ItemRow = {
  key:               string;
  insumo_id:         string;
  unidad:            string;
  stock_actual:      number;
  precio_unitario:   string;
  cantidad:          string;
  iva_pct:           number;
  fecha_vencimiento: string;
};

let rowKey = 0;
const newRow = (): ItemRow => ({
  key:               String(rowKey++),
  insumo_id:         "",
  unidad:            "",
  stock_actual:      0,
  precio_unitario:   "",
  cantidad:          "",
  iva_pct:           21,
  fecha_vencimiento: "",
});

type Props = {
  insumos:   InsumoBasico[];
  historial: RecepcionHistorial[];
};

export function RecepcionesClient({ insumos, historial }: Props) {
  const [formOpen, setFormOpen] = useState(false);

  // Cabecera
  const [tipo,      setTipo]      = useState<"factura" | "remito">("factura");
  const [numero,    setNumero]    = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fecha,     setFecha]     = useState(hoy());
  const [notas,     setNotas]     = useState("");
  const [otrosImp,  setOtrosImp]  = useState("");

  // Ítems
  const [rows, setRows] = useState<ItemRow[]>([newRow()]);

  const [error,     setError]    = useState<string | null>(null);
  const [ok,        setOk]       = useState<string | null>(null);
  const [isPending, start]       = useTransition();

  const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

  function handleInsumoChange(key: string, insumoId: string) {
    const ins = insumoMap[insumoId];
    setRows(prev => prev.map(r =>
      r.key !== key ? r : {
        ...r,
        insumo_id:       insumoId,
        unidad:          ins?.unidad ?? "",
        stock_actual:    ins?.stock_actual ?? 0,
        precio_unitario: ins ? String(ins.precio_unitario) : "",
      }
    ));
  }

  function updateRow<K extends keyof ItemRow>(key: string, field: K, value: ItemRow[K]) {
    setRows(prev => prev.map(r => r.key !== key ? r : { ...r, [field]: value }));
  }

  function removeRow(key: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.key !== key) : prev);
  }

  function addRow() { setRows(prev => [...prev, newRow()]); }

  // Totales
  const totales = rows.reduce(
    (acc, r) => {
      const cant   = parseFloat(r.cantidad.replace(",", ".")) || 0;
      const precio = parseFloat(r.precio_unitario.replace(",", ".")) || 0;
      const neto   = cant * precio;
      const iva    = neto * (r.iva_pct / 100);
      return { neto: acc.neto + neto, iva: acc.iva + iva };
    },
    { neto: 0, iva: 0 },
  );
  const otrosNum   = parseFloat(otrosImp.replace(",", ".")) || 0;
  const totalFinal = totales.neto + totales.iva + otrosNum;

  function resetForm() {
    setTipo("factura"); setNumero(""); setProveedor("");
    setFecha(hoy()); setNotas(""); setOtrosImp(""); setRows([newRow()]);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);

    const items = rows
      .filter(r => r.insumo_id)
      .map(r => ({
        insumo_id:         r.insumo_id,
        cantidad:          parseFloat(r.cantidad.replace(",", ".")) || 0,
        unidad:            r.unidad,
        precio_unitario:   parseFloat(r.precio_unitario.replace(",", ".")) || 0,
        iva_pct:           r.iva_pct,
        fecha_vencimiento: r.fecha_vencimiento || null,
      }))
      .filter(i => i.cantidad > 0);

    if (items.length === 0) return setError("Completá al menos un ítem con insumo y cantidad");

    start(async () => {
      const res = await registrarRecepcion(
        tipo, numero, proveedor, fecha, notas || null, otrosNum, items,
      );
      if ("error" in res) { setError(res.error); return; }
      setOk(`${tipo === "factura" ? "Factura" : "Remito"} ${numero} registrado. Stock y precios actualizados.`);
      resetForm();
      setFormOpen(false);
    });
  }

  const inputCls   = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 disabled:opacity-50 bg-white";
  const inputSmCls = "px-2 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 disabled:opacity-50 bg-white";

  return (
    <div className="space-y-6">

      {!formOpen && (
        <button
          onClick={() => { setFormOpen(true); setOk(null); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#16233f] text-white text-sm font-medium rounded-xl hover:bg-[#253760] transition-colors"
        >
          <Plus className="size-4" />
          Nueva recepción
        </button>
      )}

      {ok && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          ✓ {ok}
        </p>
      )}

      {/* Formulario */}
      {formOpen && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-neutral-800">Nueva recepción de mercadería</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Insumos con IVA: ingresá el precio <strong>neto (sin IVA)</strong>. El sistema calcula el IVA y cierra el total.
              </p>
            </div>
            <button onClick={() => { setFormOpen(false); resetForm(); }}
              className="shrink-0 text-xs text-neutral-400 hover:text-neutral-600 px-3 py-1.5 border border-neutral-200 rounded-lg">
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">

            {/* Cabecera */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Tipo *</label>
                <div className="flex rounded-xl overflow-hidden border border-neutral-200">
                  {(["factura", "remito"] as const).map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setTipo(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                        tipo === t ? "bg-[#16233f] text-white" : "bg-white text-neutral-500 hover:bg-neutral-50"
                      }`}
                    >
                      {t === "factura" ? <FileText className="size-3.5" /> : <ClipboardList className="size-3.5" />}
                      {t === "factura" ? "Factura" : "Remito"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Número *</label>
                <input value={numero} onChange={e => setNumero(e.target.value)} required
                  placeholder="0001-00012345" className={inputCls} disabled={isPending} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Proveedor *</label>
                <input value={proveedor} onChange={e => setProveedor(e.target.value)} required
                  placeholder="Nombre del proveedor" className={inputCls} disabled={isPending}
                  list="proveedores-list" />
                <datalist id="proveedores-list">
                  {[...new Set(insumos.map(i => i.proveedor).filter(Boolean))].map(p => (
                    <option key={p!} value={p!} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  className={inputCls} disabled={isPending} />
              </div>
            </div>

            {/* Tabla ítems */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 920 }}>
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100 text-left">
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Insumo</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-24">Cantidad</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-10">Un.</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-32">Precio neto/u.</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-40">IVA</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-32">Vencimiento</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-28 text-right">Subtotal c/IVA</th>
                      <th className="px-3 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {rows.map(row => {
                      const cant      = parseFloat(row.cantidad.replace(",", ".")) || 0;
                      const precio    = parseFloat(row.precio_unitario.replace(",", ".")) || 0;
                      const neto      = cant * precio;
                      const ivaAmt    = neto * (row.iva_pct / 100);
                      const subTotal  = neto + ivaAmt;
                      const stockPost = row.insumo_id ? row.stock_actual + cant : null;

                      return (
                        <tr key={row.key} className="hover:bg-neutral-50/50">
                          <td className="px-3 py-2">
                            <select
                              value={row.insumo_id}
                              onChange={e => handleInsumoChange(row.key, e.target.value)}
                              className={`${inputSmCls} w-full`} disabled={isPending}
                            >
                              <option value="">— Insumo —</option>
                              {insumos.map(i => (
                                <option key={i.id} value={i.id}>{i.nombre}</option>
                              ))}
                            </select>
                            {stockPost !== null && (
                              <p className="text-xs text-neutral-400 mt-0.5 px-1">
                                Stock: {fmtNum(row.stock_actual)} →{" "}
                                <span className="text-emerald-600 font-medium">{fmtNum(stockPost)}</span>{" "}
                                {row.unidad}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.cantidad}
                              onChange={e => updateRow(row.key, "cantidad", e.target.value)}
                              inputMode="decimal" placeholder="0"
                              className={`${inputSmCls} w-full text-right`} disabled={isPending}
                            />
                          </td>
                          <td className="px-3 py-2 text-xs text-neutral-500 font-mono">
                            {row.unidad || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs text-neutral-400">$</span>
                              <input
                                value={row.precio_unitario}
                                onChange={e => updateRow(row.key, "precio_unitario", e.target.value)}
                                inputMode="decimal" placeholder="0"
                                className={`${inputSmCls} w-full text-right`} disabled={isPending}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.iva_pct}
                              onChange={e => updateRow(row.key, "iva_pct", parseFloat(e.target.value))}
                              className={`${inputSmCls} w-full text-xs`} disabled={isPending}
                            >
                              {IVA_OPCIONES.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            {row.iva_pct > 0 && neto > 0 && (
                              <p className="text-xs text-neutral-400 mt-0.5 px-1 tabular-nums">
                                IVA: {fmtPrecio(ivaAmt)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={row.fecha_vencimiento}
                              onChange={e => updateRow(row.key, "fecha_vencimiento", e.target.value)}
                              className={`${inputSmCls} w-full text-xs`} disabled={isPending}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-neutral-800">
                            {subTotal > 0
                              ? fmtPrecio(subTotal)
                              : <span className="text-neutral-300 font-normal">—</span>
                            }
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeRow(row.key)}
                              disabled={rows.length === 1 || isPending}
                              className="p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-20">
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-200 bg-neutral-50/50">
                      <td className="px-3 py-2" colSpan={6}>
                        <button type="button" onClick={addRow} disabled={isPending}
                          className="flex items-center gap-1.5 text-sm text-[#16233f] hover:underline disabled:opacity-40">
                          <Plus className="size-3.5" /> Agregar ítem
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-neutral-400 space-y-0.5" colSpan={2}>
                        <div>Neto: <span className="text-neutral-700 font-medium">{fmtPrecio(totales.neto)}</span></div>
                        {totales.iva > 0 && (
                          <div>IVA: <span className="text-neutral-700 font-medium">{fmtPrecio(totales.iva)}</span></div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Otros impuestos + notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Otros impuestos / cargos
                  <span className="font-normal ml-1 text-neutral-400">(percepciones, flete, etc.)</span>
                </label>
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                  <span className="px-3 py-2 text-sm text-neutral-400 bg-neutral-50 border-r border-neutral-200">$</span>
                  <input value={otrosImp} onChange={e => setOtrosImp(e.target.value)}
                    inputMode="decimal" placeholder="0"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 text-right disabled:opacity-50"
                    disabled={isPending} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Notas (opcional)</label>
                <input value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Observaciones…"
                  className={inputCls} disabled={isPending} />
              </div>
            </div>

            {/* Resumen total */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 flex items-end justify-between gap-4">
              <div className="text-xs text-neutral-400 space-y-0.5 tabular-nums">
                <div>Subtotal neto: <span className="text-neutral-700 font-medium">{fmtPrecio(totales.neto)}</span></div>
                <div>IVA total:     <span className="text-neutral-700 font-medium">{fmtPrecio(totales.iva)}</span></div>
                {otrosNum > 0 && (
                  <div>Otros cargos: <span className="text-neutral-700 font-medium">{fmtPrecio(otrosNum)}</span></div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-400 mb-0.5">Total {tipo}</div>
                <div className="text-2xl font-bold tabular-nums text-neutral-900">
                  {fmtPrecio(totalFinal)}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
            )}

            <button type="submit" disabled={isPending}
              className="px-6 py-2.5 bg-[#16233f] text-white text-sm font-medium rounded-xl hover:bg-[#253760] disabled:opacity-40 transition-colors">
              {isPending ? "Registrando…" : "Confirmar recepción"}
            </button>
          </form>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-800">Historial de recepciones</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Fecha</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Tipo / Número</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Proveedor</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Ítems</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {historial.map(h => (
                <tr key={h.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 text-neutral-500 text-xs">{fmtFecha(h.fecha)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-2 ${
                      h.tipo === "factura" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {h.tipo === "factura" ? "Factura" : "Remito"}
                    </span>
                    <span className="font-mono text-sm text-neutral-800">{h.numero}</span>
                  </td>
                  <td className="px-5 py-3 font-medium text-neutral-800">{h.proveedor}</td>
                  <td className="px-5 py-3 text-center text-neutral-500 text-xs">{h.items_count}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-neutral-800">
                    {h.total !== null ? fmtPrecio(h.total) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historial.length === 0 && !formOpen && (
        <div className="bg-white rounded-2xl border border-neutral-200 px-8 py-12 text-center">
          <p className="text-sm text-neutral-400">Todavía no hay recepciones registradas.</p>
          <p className="text-xs text-neutral-300 mt-1">Usá el botón de arriba para cargar tu primera factura o remito.</p>
        </div>
      )}
    </div>
  );
}
