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

export function ProduccionClient({ productos, historial }: Props) {
  const [productoId,    setProductoId]    = useState("");
  const [cantLotes,     setCantLotes]     = useState("1");
  const [vidaUtil,      setVidaUtil]      = useState(180);
  const [fecha,         setFecha]         = useState(hoy());
  const [notas,         setNotas]         = useState("");
  const [error,         setError]         = useState<string | null>(null);
  const [resultado,     setResultado]     = useState<{ numero_lote: string; cajas: number } | null>(null);
  const [isPending,     start]            = useTransition();

  const producto = useMemo(
    () => productos.find(p => p.id === productoId) ?? null,
    [productos, productoId],
  );

  // Al cambiar de producto, actualizar vida útil configurada
  function handleProductoChange(id: string) {
    setProductoId(id);
    const p = productos.find(p => p.id === id);
    if (p) setVidaUtil(p.vida_util_dias);
    setResultado(null);
    setError(null);
  }

  const lotes = parseFloat(cantLotes.replace(",", ".")) || 0;
  const cajas = producto?.receta ? lotes * producto.receta.yield_cajas : 0;
  const fechaVenc = fecha && vidaUtil > 0 ? calcularVencimiento(fecha, vidaUtil) : null;

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
    if (!productoId) return setError("Seleccioná un producto");
    if (lotes <= 0) return setError("La cantidad de lotes debe ser mayor a 0");

    const fd = new FormData();
    fd.set("producto_id",   productoId);
    fd.set("receta_id",     producto!.receta!.id);
    fd.set("cantidad_lotes",String(lotes));
    fd.set("yield_cajas",   String(producto!.receta!.yield_cajas));
    fd.set("vida_util_dias",String(vidaUtil));
    fd.set("fecha",         fecha);
    fd.set("notas",         notas);

    start(async () => {
      const res = await registrarProduccion(fd);
      if ("error" in res) { setError(res.error); return; }
      setResultado({ numero_lote: res.numero_lote, cajas });
      setProductoId(""); setCantLotes("1"); setNotas(""); setFecha(hoy());
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 disabled:opacity-50";

  return (
    <div className="space-y-6">

      {/* Formulario */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-semibold text-neutral-800">Registrar producción</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            Al confirmar se descuentan los insumos y se crea el lote automáticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Producto + lotes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Producto *</label>
              <select
                value={productoId}
                onChange={e => handleProductoChange(e.target.value)}
                className={inputCls} disabled={isPending} required>
                <option value="">— Seleccionar producto —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.sku ? ` (${p.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Lotes a producir *</label>
              <input
                type="text" inputMode="decimal" placeholder="1"
                value={cantLotes}
                onChange={e => { setCantLotes(e.target.value); setResultado(null); }}
                className={inputCls} disabled={isPending} />
            </div>
          </div>

          {/* Info de rendimiento */}
          {producto?.receta && (
            <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Receta: rinde <strong className="text-neutral-700">{fmt(producto.receta.yield_cajas)} cajas</strong> / lote
              </span>
              {lotes > 0 && (
                <span>
                  Producción: <strong className="text-neutral-800">{lotes} lote{lotes !== 1 ? "s" : ""}</strong>
                  {" = "}
                  <strong className="text-neutral-800">{fmt(cajas)} cajas</strong>
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
                <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                  Insumos a descontar ({lotes} lote{lotes !== 1 ? "s" : ""})
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-50 text-left">
                    <th className="px-4 py-2 text-xs font-medium text-neutral-400">Insumo</th>
                    <th className="px-4 py-2 text-xs font-medium text-neutral-400 text-right">A descontar</th>
                    <th className="px-4 py-2 text-xs font-medium text-neutral-400 text-right">Stock actual</th>
                    <th className="px-4 py-2 text-xs font-medium text-neutral-400 text-right">Tras producción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {preview.map(ing => {
                    const unidad    = ing.insumo?.unidad ?? "";
                    const stockTras = (ing.insumo?.stock_actual ?? 0) - ing.a_descontar;
                    return (
                      <tr key={ing.insumo_id} className={ing.suficiente ? "" : "bg-red-50"}>
                        <td className="px-4 py-2 font-medium text-neutral-800">
                          {ing.insumo?.nombre ?? ing.insumo_id}
                          {!ing.suficiente && (
                            <span className="ml-2 text-xs text-red-600 font-normal">⚠ stock insuficiente</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-700">
                          {fmt(ing.a_descontar)} {unidad}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-400">
                          {ing.insumo ? `${fmt(ing.insumo.stock_actual)} ${unidad}` : "—"}
                        </td>
                        <td className={`px-4 py-2 text-right tabular-nums font-semibold ${stockTras < 0 ? "text-red-600" : "text-neutral-700"}`}>
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
              <label className="block text-xs font-medium text-neutral-500 mb-1">Fecha de producción</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Vida útil (días)</label>
              <input type="number" min="1" value={vidaUtil}
                onChange={e => setVidaUtil(parseInt(e.target.value) || 180)}
                className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Notas (opcional)</label>
              <input type="text" placeholder="Observaciones…"
                value={notas} onChange={e => setNotas(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
          </div>

          {lotes > 0 && lotes !== Math.floor(lotes) && (
            <p className="text-sm text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
              ℹ Producción con fracción de lote ({lotes} lotes → {fmt(cajas)} cajas).
              La fracción restante se contabiliza en el próximo lote.
            </p>
          )}

          {stockInsuficiente && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              ⚠ Uno o más insumos no tienen stock suficiente. El sistema igual registrará la producción y el stock quedará negativo.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          {resultado && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-0.5">
              <p className="font-semibold">✓ Producción registrada</p>
              <p>Lote: <span className="font-mono font-semibold">{resultado.numero_lote}</span> — {fmt(resultado.cajas)} cajas</p>
              {fechaVenc && <p>Vence: {fmtFecha(fechaVenc)}</p>}
            </div>
          )}

          <button type="submit" disabled={isPending || !productoId || lotes < 1}
            className="px-6 py-2.5 bg-[#16233f] text-white text-sm font-medium rounded-xl hover:bg-[#253760] disabled:opacity-40 transition-colors">
            {isPending ? "Registrando…" : "Confirmar producción"}
          </button>
        </form>
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-800">Historial de producción</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Fecha</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Cajas</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {historial.map(h => (
                <tr key={h.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 text-neutral-500 text-xs">{fmtFecha(h.fecha)}</td>
                  <td className="px-5 py-3 font-medium text-neutral-800">
                    {h.producto?.name ?? "—"}
                    {h.producto?.sku && <span className="text-neutral-400 font-mono text-xs ml-1">{h.producto.sku}</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-neutral-800">
                    {fmt(h.cantidad_cajas)}
                  </td>
                  <td className="px-5 py-3 text-neutral-400 text-xs">{h.notas ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
