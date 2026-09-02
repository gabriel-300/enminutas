"use client";

import { useState, useTransition, useMemo } from "react";
import { registrarProduccion, type ProductoConReceta, type ProduccionHistorial } from "./actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(n);

const fmtFecha = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const hoy = () => new Date().toISOString().slice(0, 10);

type Props = {
  productos:  ProductoConReceta[];
  historial:  ProduccionHistorial[];
};

export function ProduccionClient({ productos, historial }: Props) {
  const [productoId,  setProductoId]  = useState("");
  const [cantCajas,   setCantCajas]   = useState("");
  const [fecha,       setFecha]       = useState(hoy());
  const [notas,       setNotas]       = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [ok,          setOk]          = useState(false);
  const [isPending,   start]          = useTransition();

  const producto = useMemo(
    () => productos.find(p => p.id === productoId) ?? null,
    [productos, productoId],
  );

  const cajas = parseFloat(cantCajas.replace(",", ".")) || 0;

  // Calcular insumos a descontar según cantidad de cajas
  const preview = useMemo(() => {
    if (!producto?.receta || cajas <= 0) return [];
    const factor = cajas / producto.receta.yield_cajas;
    return producto.receta.ingredients.map(ing => ({
      ...ing,
      a_descontar: ing.cantidad * factor,
      suficiente:  ing.insumo ? (ing.insumo.stock_actual >= ing.cantidad * factor) : true,
    }));
  }, [producto, cajas]);

  const stockInsuficiente = preview.some(p => !p.suficiente);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!productoId) return setError("Seleccioná un producto");
    if (cajas <= 0)  return setError("La cantidad de cajas debe ser mayor a 0");

    const fd = new FormData();
    fd.set("producto_id",    productoId);
    fd.set("receta_id",      producto!.receta!.id);
    fd.set("cantidad_cajas", String(cajas));
    fd.set("fecha",          fecha);
    fd.set("notas",          notas);

    start(async () => {
      const res = await registrarProduccion(fd);
      if ("error" in res) { setError(res.error); return; }
      setOk(true);
      setProductoId(""); setCantCajas(""); setNotas(""); setFecha(hoy());
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
            Al confirmar se descuentan automáticamente los insumos según la receta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Selección de producto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Producto *</label>
              <select
                value={productoId}
                onChange={e => { setProductoId(e.target.value); setOk(false); setError(null); }}
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
              <label className="block text-xs font-medium text-neutral-500 mb-1">Cajas a producir *</label>
              <input
                type="text" inputMode="decimal" placeholder="0"
                value={cantCajas} onChange={e => { setCantCajas(e.target.value); setOk(false); }}
                className={inputCls} disabled={isPending} />
            </div>
          </div>

          {/* Info de receta */}
          {producto?.receta && (
            <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl px-4 py-2">
              Receta: rinde <strong className="text-neutral-700">{fmt(producto.receta.yield_cajas)} cajas</strong> por lote
              {cajas > 0 && (
                <> — produciendo {fmt(cajas)} cajas ({fmt(cajas / producto.receta.yield_cajas)} lotes)</>
              )}
            </div>
          )}

          {/* Preview de insumos a descontar */}
          {preview.length > 0 && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                  Insumos a descontar
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
                    const unidad = ing.insumo?.unidad ?? "";
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

          {/* Fecha + notas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Notas (opcional)</label>
              <input type="text" placeholder="Observaciones…"
                value={notas} onChange={e => setNotas(e.target.value)}
                className={inputCls} disabled={isPending} />
            </div>
          </div>

          {stockInsuficiente && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              ⚠ Uno o más insumos no tienen stock suficiente. El sistema igual registrará la producción y el stock quedará negativo.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          {ok && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              ✓ Producción registrada y stock de insumos actualizado.
            </p>
          )}

          <button type="submit" disabled={isPending || !productoId || cajas <= 0}
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
