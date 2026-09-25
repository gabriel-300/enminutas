"use client";

import { useState, useTransition, useMemo } from "react";
import { registrarProduccion, type ProductoConReceta, type ProduccionHistorial } from "./actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(n);

const fmtFecha = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

const hoy = () => new Date().toISOString().slice(0, 10);

function calcularVencimiento(fecha: string, dias: number): string {
  const d = new Date(fecha + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

type Props = {
  productos: ProductoConReceta[];
  historial: ProduccionHistorial[];
};

type Fila = { presentacionId: string; cajas: string };

export function ProduccionClient({ productos, historial }: Props) {
  const [productoId,    setProductoId]    = useState("");
  const [filas,         setFilas]         = useState<Fila[]>([]);
  const [cantLotes,     setCantLotes]     = useState("1");
  const [vidaUtil,      setVidaUtil]      = useState(180);
  const [fecha,         setFecha]         = useState(hoy());
  const [notas,         setNotas]         = useState("");
  const [error,         setError]         = useState<string | null>(null);
  const [resultado,     setResultado]     = useState<{ numero_lote: string; items: { name: string; unit_label: string | null; cajas: number }[] } | null>(null);
  const [isPending,     start]            = useTransition();

  const producto = useMemo(
    () => productos.find(p => p.id === productoId) ?? null,
    [productos, productoId],
  );

  // Al cambiar de producto: vida útil de la receta y presentación sugerida (la que más falta)
  function handleProductoChange(id: string) {
    setProductoId(id);
    const p = productos.find(p => p.id === id);
    if (p) {
      setVidaUtil(p.vida_util_dias);
      const inicial = p.presentaciones.find(x => x.id === p.sugerida_id)
        ?? p.presentaciones.find(x => x.es_base)
        ?? p.presentaciones[0];
      setFilas(inicial ? [{ presentacionId: inicial.id, cajas: "" }] : []);
    } else {
      setFilas([]);
    }
    setResultado(null);
    setError(null);
  }

  const lotes = parseFloat(cantLotes.replace(",", ".")) || 0;
  const fechaVenc = fecha && vidaUtil > 0 ? calcularVencimiento(fecha, vidaUtil) : null;
  const unica = filas.length === 1;

  // Cajas de cada presentación: lo tipeado o, con una sola presentación, lo calculado por peso
  const detalle = filas.map(f => {
    const pres   = producto?.presentaciones.find(p => p.id === f.presentacionId) ?? null;
    const manual = parseFloat(f.cajas.replace(",", ".")) || 0;
    const auto   = unica && pres?.cajas_por_lote != null ? Math.round(lotes * pres.cajas_por_lote * 100) / 100 : 0;
    const cajas  = manual > 0 ? manual : auto;
    const kg     = pres?.kg_caja ? cajas * pres.kg_caja : null;
    return { fila: f, pres, cajas, kg, auto };
  });
  const totalCajas   = detalle.reduce((s, d) => s + d.cajas, 0);
  const kgLote       = producto?.receta.kg_lote ?? null;
  const kgBatch      = kgLote !== null ? kgLote * lotes : null;
  const kgAsignado   = detalle.every(d => d.kg !== null) ? detalle.reduce((s, d) => s + (d.kg ?? 0), 0) : null;
  const diferenciaKg = kgBatch !== null && kgAsignado !== null ? kgBatch - kgAsignado : null;

  function setFila(i: number, patch: Partial<Fila>) {
    setFilas(fs => fs.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  }

  function agregarFila() {
    if (!producto) return;
    const libres = producto.presentaciones.filter(p => !filas.some(f => f.presentacionId === p.id));
    if (libres.length === 0) return;
    setFilas(fs => [
      // Al pasar a varias presentaciones la primera deja de ser automática: queda fija en lo calculado
      ...fs.map(f => fs.length === 1 && f.cajas === "" && detalle[0]?.auto ? { ...f, cajas: String(detalle[0].auto) } : f),
      { presentacionId: libres[0].id, cajas: "" },
    ]);
    setResultado(null);
  }

  function quitarFila(i: number) {
    setFilas(fs => fs.filter((_, idx) => idx !== i));
  }

  // Completa la fila con los kg del batch que todavía no están asignados a otras presentaciones
  function usarResto(i: number) {
    const d = detalle[i];
    if (!d.pres?.kg_caja || kgBatch === null) return;
    const otros = detalle.reduce((s, x, idx) => idx === i ? s : s + (x.kg ?? 0), 0);
    const restoKg = kgBatch - otros;
    if (restoKg <= 0) return;
    setFila(i, { cajas: String(Math.round((restoKg / d.pres.kg_caja) * 100) / 100) });
  }

  // Calcular insumos a descontar
  const preview = useMemo(() => {
    if (!producto?.receta || lotes <= 0) return [];
    return producto.receta.ingredients.map(ing => ({
      ...ing,
      a_descontar: ing.cantidad * lotes,
      suficiente:  ing.insumo ? (ing.insumo.stock_actual >= ing.cantidad * lotes) : true,
    }));
  }, [producto, lotes]);

  const stockInsuficiente = preview.some(p => !p.suficiente);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    if (!productoId || filas.length === 0) return setError("Seleccioná un producto y al menos una presentación");
    if (lotes <= 0) return setError("La cantidad de lotes debe ser mayor a 0");
    const sinCajas = detalle.find(d => d.cajas <= 0);
    if (sinCajas) {
      return setError(`Ingresá las cajas de «${sinCajas.pres?.unit_label?.trim() || sinCajas.pres?.name || "la presentación"}».`);
    }

    const fd = new FormData();
    fd.set("receta_id",     producto!.receta.id);
    fd.set("cantidad_lotes",String(lotes));
    fd.set("items",         JSON.stringify(detalle.map(d => ({ producto_id: d.fila.presentacionId, cajas: d.cajas }))));
    fd.set("vida_util_dias",String(vidaUtil));
    fd.set("fecha",         fecha);
    fd.set("notas",         notas);

    start(async () => {
      const res = await registrarProduccion(fd);
      if ("error" in res) { setError(res.error); return; }
      setResultado({ numero_lote: res.numero_lote, items: res.items });
      setProductoId(""); setFilas([]); setCantLotes("1"); setNotas(""); setFecha(hoy());
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50";

  return (
    <div className="space-y-6">

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-semibold text-neutral-800">Registrar producción</p>
          <p className="text-xs text-neutral-600 mt-0.5">
            Al confirmar se descuentan los insumos y se crea el lote automáticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Producto + lotes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Producto *</label>
              <select
                value={productoId}
                onChange={e => handleProductoChange(e.target.value)}
                className={inputCls} disabled={isPending} required>
                <option value="">— Seleccionar receta / producto —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.sku ? ` (${p.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Lotes a producir *</label>
              <input
                type="text" inputMode="decimal" placeholder="1"
                value={cantLotes}
                onChange={e => { setCantLotes(e.target.value); setResultado(null); }}
                className={inputCls} disabled={isPending} />
            </div>
          </div>

          {/* Presentaciones en las que sale el batch */}
          {producto && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-[13px] font-medium text-neutral-800">Presentaciones y cajas obtenidas *</label>
                {filas.length < producto.presentaciones.length && (
                  <button type="button" onClick={agregarFila} disabled={isPending}
                    className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-40">
                    + Agregar otra presentación
                  </button>
                )}
              </div>

              {detalle.map((d, i) => {
                const usadas = filas.filter((_, idx) => idx !== i).map(f => f.presentacionId);
                return (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-3 items-start">
                    <div>
                      <select
                        value={d.fila.presentacionId}
                        onChange={e => { setFila(i, { presentacionId: e.target.value, cajas: "" }); setResultado(null); }}
                        className={inputCls} disabled={isPending} required>
                        {producto.presentaciones.filter(p => !usadas.includes(p.id)).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.unit_label?.trim() || p.name}{p.sku ? ` (${p.sku})` : ""}
                            {p.id === producto.sugerida_id ? ` — sugerida, faltan ${fmt(p.faltante)}` : ""}
                          </option>
                        ))}
                      </select>
                      {d.pres?.kg_caja == null ? (
                        <p className="text-xs text-warning mt-1">Falta el kg por caja de esta presentación: ingresá las cajas a mano.</p>
                      ) : d.cajas > 0 && d.kg !== null ? (
                        <p className="text-xs text-neutral-600 mt-1">{fmt(d.cajas)} cajas ≈ {fmt(d.kg)} kg</p>
                      ) : null}
                    </div>
                    <input
                      type="text" inputMode="decimal" aria-label="Cajas obtenidas"
                      placeholder={d.auto > 0 ? `${fmt(d.auto)} cajas` : "cajas"}
                      value={d.fila.cajas}
                      onChange={e => { setFila(i, { cajas: e.target.value }); setResultado(null); }}
                      className={inputCls} disabled={isPending} />
                    {filas.length > 1 ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => usarResto(i)} disabled={isPending || kgBatch === null || !d.pres?.kg_caja}
                          title="Completar con los kg que todavía no se asignaron"
                          className="px-3 py-2 text-xs font-medium border border-neutral-400 rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">
                          Usar el resto
                        </button>
                        <button type="button" onClick={() => quitarFila(i)} disabled={isPending} aria-label="Quitar presentación"
                          className="px-3 py-2 text-xs border border-neutral-400 rounded-lg text-danger hover:bg-danger-bg disabled:opacity-40">
                          ✕
                        </button>
                      </div>
                    ) : <div className="hidden md:block" />}
                  </div>
                );
              })}

              {filas.length === 1 && (
                <p className="text-xs text-neutral-600">
                  {producto.sugerida_id ? "Sugerida según pedidos pendientes y stock mínimo. " : ""}
                  Las cajas se calculan por peso; corregilas si salió distinto. Si el lote sale en varias presentaciones, agregá las otras.
                </p>
              )}

              {diferenciaKg !== null && kgBatch !== null && lotes > 0 && filas.length > 0 && totalCajas > 0 && (
                <p className={`text-xs rounded-lg px-3 py-2 border ${
                  Math.abs(diferenciaKg) <= kgBatch * 0.02
                    ? "text-success bg-success-bg border-success-border"
                    : diferenciaKg < 0
                      ? "text-warning bg-warning-bg border-warning-border"
                      : "text-info bg-info-bg border-info-border"
                }`}>
                  Asignado <strong>{fmt(kgAsignado ?? 0)} kg</strong> de <strong>{fmt(kgBatch)} kg</strong> del batch
                  {Math.abs(diferenciaKg) <= kgBatch * 0.02
                    ? " ✓"
                    : diferenciaKg > 0
                      ? ` — sin asignar ${fmt(diferenciaKg)} kg (merma o resto)`
                      : ` — te pasás por ${fmt(-diferenciaKg)} kg, revisá las cajas`}
                </p>
              )}
            </div>
          )}

          {/* Info de rendimiento */}
          {producto && (
            <div className="text-xs text-neutral-600 bg-neutral-50 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Receta: 1 lote{kgLote !== null ? <> ≈ <strong className="text-neutral-700">{fmt(kgLote)} kg</strong></> : ""}
              </span>
              {lotes > 0 && totalCajas > 0 && (
                <span>
                  Producción: <strong className="text-neutral-800">{lotes} lote{lotes !== 1 ? "s" : ""}</strong>
                  {" = "}
                  <strong className="text-neutral-800">{fmt(totalCajas)} cajas</strong>
                  {filas.length > 1 ? ` en ${filas.length} presentaciones` : ""}
                </span>
              )}
              {fechaVenc && lotes > 0 && (
                <span>
                  Vencimiento: <strong className="text-neutral-800">{fmtFecha(fechaVenc)}</strong>
                </span>
              )}
            </div>
          )}

          {/* Preview insumos a descontar */}
          {preview.length > 0 && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-600">
                  Insumos a descontar ({lotes} lote{lotes !== 1 ? "s" : ""})
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-50 text-left">
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-600">Insumo</th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-600 text-right">A descontar</th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-600 text-right">Stock actual</th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-600 text-right">Tras producción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {preview.map(ing => {
                    const unidad    = ing.insumo?.unidad ?? "";
                    const stockTras = (ing.insumo?.stock_actual ?? 0) - ing.a_descontar;
                    return (
                      <tr key={ing.insumo_id} className={ing.suficiente ? "" : "bg-danger-bg"}>
                        <td className="px-4 py-2 font-medium text-neutral-800">
                          {ing.insumo?.nombre ?? ing.insumo_id}
                          {!ing.suficiente && (
                            <span className="ml-2 text-xs text-danger font-normal">⚠ stock insuficiente</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-700">
                          {fmt(ing.a_descontar)} {unidad}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-600">
                          {ing.insumo ? `${fmt(ing.insumo.stock_actual)} ${unidad}` : "—"}
                        </td>
                        <td className={`px-4 py-2 text-right tabular-nums font-semibold ${stockTras < 0 ? "text-danger" : "text-neutral-700"}`}>
                          {ing.insumo ? `${fmt(stockTras)} ${unidad}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Fecha + vida útil + notas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Fecha de producción</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Vida útil (días)</label>
              <input type="number" min="1" value={vidaUtil}
                onChange={e => setVidaUtil(parseInt(e.target.value) || 180)}
                className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Notas (opcional)</label>
              <input type="text" placeholder="Observaciones…"
                value={notas} onChange={e => setNotas(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
          </div>

          {lotes > 0 && lotes !== Math.floor(lotes) && (
            <p className="text-sm text-info bg-info-bg border border-info-border rounded-xl px-4 py-3">
              ℹ Producción parcial ({lotes} lotes → {fmt(totalCajas)} cajas). Se registra exactamente lo producido. La próxima producción se ingresa por separado con su propia cantidad.
            </p>
          )}

          {stockInsuficiente && (
            <p className="text-sm text-warning bg-warning-bg border border-warning-border rounded-xl px-4 py-3">
              ⚠ Uno o más insumos no tienen stock suficiente. El sistema igual registrará la producción y el stock quedará negativo.
            </p>
          )}

          {error && (
            <p className="text-sm text-danger bg-danger-bg border border-danger-border rounded-xl px-4 py-3">{error}</p>
          )}

          {resultado && (
            <div className="text-sm text-success bg-success-bg border border-success-border rounded-xl px-4 py-3 space-y-0.5">
              <p className="font-semibold">✓ Producción registrada</p>
              <p>Lote: <span className="font-mono font-semibold">{resultado.numero_lote}</span></p>
              <ul className="list-disc pl-5">
                {resultado.items.map((it, i) => (
                  <li key={i}>{fmt(it.cajas)} cajas — {it.unit_label?.trim() || it.name}</li>
                ))}
              </ul>
              {fechaVenc && <p>Vence: {fmtFecha(fechaVenc)}</p>}
            </div>
          )}

          <button type="submit" disabled={isPending || !productoId || lotes <= 0}
            className="px-6 py-2.5 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-40 transition-colors">
            {isPending ? "Registrando…" : "Confirmar producción"}
          </button>
        </form>
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-800">Historial de producción</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600">Fecha</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600">Producto</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600 text-right">Cajas</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {historial.map(h => (
                <tr key={h.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 text-neutral-600 text-xs">{fmtFecha(h.fecha)}</td>
                  <td className="px-5 py-3 font-medium text-neutral-800">
                    {h.producto?.name ?? "—"}
                    {h.producto?.sku && <span className="text-neutral-600 font-mono text-xs ml-1">{h.producto.sku}</span>}
                    {h.producto?.unit_label && <span className="block text-xs text-neutral-600 font-normal">{h.producto.unit_label}</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-neutral-800">
                    {fmt(h.cantidad_cajas)}
                  </td>
                  <td className="px-5 py-3 text-neutral-600 text-xs">{h.notas ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
