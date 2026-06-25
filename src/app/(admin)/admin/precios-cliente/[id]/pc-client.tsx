"use client";

import { useState, useTransition, useId } from "react";
import { guardarPrecioCliente, eliminarPrecioCliente } from "../actions";
import { Plus, X, Trash2 } from "lucide-react";

type Override = {
  id: string;
  producto_id: string;
  producto_nombre: string;
  precio_b2b_std: number;
  tipo: string;
  precio_fijo: number | null;
  descuento_pct: number | null;
  vigente_desde: string;
  vigente_hasta: string | null;
  notas: string | null;
};

type Producto = { id: string; name: string; price_b2b: number };

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

export function PcClient({
  clienteId,
  overrides,
  productos,
}: {
  clienteId: string;
  overrides: Override[];
  productos: Producto[];
}) {
  const formId = useId();
  const [pending, start]  = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productoId, setProductoId]   = useState("");
  const [tipo, setTipo]               = useState<"precio_fijo" | "descuento_pct">("precio_fijo");
  const [precioFijo, setPrecioFijo]   = useState("");
  const [descPct, setDescPct]         = useState("");
  const [desde, setDesde]             = useState(today());
  const [hasta, setHasta]             = useState("");
  const [notas, setNotas]             = useState("");

  // productos sin override ya existente
  const productosSinOverride = productos.filter(
    p => !overrides.some(o => o.producto_id === p.id)
  );

  function resetForm() {
    setProductoId(""); setTipo("precio_fijo"); setPrecioFijo("");
    setDescPct(""); setDesde(today()); setHasta(""); setNotas(""); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productoId) { setError("Seleccioná un producto"); return; }
    const pf = tipo === "precio_fijo" ? parseFloat(precioFijo.replace(",", ".")) : undefined;
    const dp = tipo === "descuento_pct" ? parseFloat(descPct.replace(",", ".")) : undefined;
    if (tipo === "precio_fijo" && (!pf || pf < 0)) { setError("Precio inválido"); return; }
    if (tipo === "descuento_pct" && (dp === undefined || dp < 0 || dp > 100)) { setError("Descuento debe estar entre 0 y 100"); return; }
    setError(null);
    start(async () => {
      const res = await guardarPrecioCliente({
        clienteId, productoId, tipo,
        precioFijo: pf, descuentoPct: dp,
        vigenteDesde: desde, vigenteHasta: hasta || undefined,
        notas: notas || undefined,
      });
      if (res.error) { setError(res.error); return; }
      resetForm(); setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este precio especial? El cliente volverá al precio estándar.")) return;
    start(async () => {
      const res = await eliminarPrecioCliente(id, clienteId);
      if (res.error) setError(res.error);
    });
  }

  const labelClass = "block text-xs font-medium text-neutral-500 mb-1";
  const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]";

  return (
    <div className="space-y-5">
      {/* Botón agregar */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Cancelar" : "Agregar precio especial"}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Nuevo precio especial</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={`${formId}-prod`} className={labelClass}>Producto *</label>
              <select
                id={`${formId}-prod`}
                value={productoId}
                onChange={e => {
                  setProductoId(e.target.value);
                  const p = productos.find(p => p.id === e.target.value);
                  if (p) setPrecioFijo(String(p.price_b2b));
                }}
                className={inputClass}
                required
              >
                <option value="">Seleccioná un producto...</option>
                {productosSinOverride.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — precio std: {fmt(p.price_b2b)}</option>
                ))}
              </select>
              {productosSinOverride.length === 0 && overrides.length > 0 && (
                <p className="text-xs text-neutral-400 mt-1">Todos los productos activos ya tienen precio especial para este cliente.</p>
              )}
            </div>

            {/* Tipo */}
            <div className="flex gap-2">
              {(["precio_fijo", "descuento_pct"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    tipo === t ? "bg-[#16233f] text-white border-[#16233f]" : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  {t === "precio_fijo" ? "Precio fijo (c/IVA)" : "Descuento %"}
                </button>
              ))}
            </div>

            {tipo === "precio_fijo" ? (
              <div>
                <label htmlFor={`${formId}-pf`} className={labelClass}>Precio acordado (con IVA) *</label>
                <input id={`${formId}-pf`} type="number" min="0" step="0.01" placeholder="0.00"
                  value={precioFijo} onChange={e => setPrecioFijo(e.target.value)} className={inputClass} required />
              </div>
            ) : (
              <div>
                <label htmlFor={`${formId}-dp`} className={labelClass}>Descuento % sobre precio de canal *</label>
                <input id={`${formId}-dp`} type="number" min="0" max="100" step="0.1" placeholder="Ej: 10"
                  value={descPct} onChange={e => setDescPct(e.target.value)} className={inputClass} required />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-desde`} className={labelClass}>Vigente desde</label>
                <input id={`${formId}-desde`} type="date" value={desde}
                  onChange={e => setDesde(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${formId}-hasta`} className={labelClass}>Vigente hasta (vacío = indefinido)</label>
                <input id={`${formId}-hasta`} type="date" value={hasta}
                  onChange={e => setHasta(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-notas`} className={labelClass}>Notas</label>
              <input id={`${formId}-notas`} type="text" placeholder="Ej: Acuerdo firmado 2026-06-01..."
                value={notas} onChange={e => setNotas(e.target.value)} className={inputClass} />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={pending}
              className="w-full py-2.5 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50">
              {pending ? "Guardando..." : "Guardar precio especial"}
            </button>
          </form>
        </div>
      )}

      {/* Tabla de overrides */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {overrides.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">
            Este cliente usa precios estándar. Agregá un precio especial arriba.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Producto</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Precio std.</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Precio especial</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Diferencia</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Vigencia</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {overrides.map(o => {
                const precioEsp = o.tipo === "precio_fijo"
                  ? o.precio_fijo!
                  : o.precio_b2b_std * (1 - (o.descuento_pct! / 100));
                const diff    = precioEsp - o.precio_b2b_std;
                const diffPct = o.precio_b2b_std > 0 ? Math.round((diff / o.precio_b2b_std) * 100) : 0;
                return (
                  <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-neutral-900">{o.producto_nombre}</p>
                      {o.notas && <p className="text-xs text-neutral-400 mt-0.5 italic">{o.notas}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-500 tabular-nums">{fmt(o.precio_b2b_std)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-neutral-900 tabular-nums">
                      {fmt(precioEsp)}
                      {o.tipo === "descuento_pct" && (
                        <span className="block text-xs font-normal text-neutral-400">−{o.descuento_pct}%</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className={`text-xs font-semibold ${diff < 0 ? "text-emerald-600" : diff > 0 ? "text-red-600" : "text-neutral-400"}`}>
                        {diff !== 0 ? `${diffPct > 0 ? "+" : ""}${diffPct}%` : "igual"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                      {new Date(o.vigente_desde + "T12:00:00").toLocaleDateString("es-AR")}
                      {o.vigente_hasta && ` → ${new Date(o.vigente_hasta + "T12:00:00").toLocaleDateString("es-AR")}`}
                      {!o.vigente_hasta && " → ∞"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleDelete(o.id)} disabled={pending}
                        className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30" title="Eliminar">
                        <Trash2 className="size-3.5" />
                      </button>
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
