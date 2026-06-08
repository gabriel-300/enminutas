"use client";

import { useState, useTransition, useMemo } from "react";
import { registrarLote, ajustarStock } from "@/app/(admin)/admin/cocina/actions";

type StockItem = {
  id:                string;
  name:              string;
  sku:               string;
  unit_label:        string | null;
  bolsas_caja:       number | null;
  categoria:         string;
  stock:             number;
  minimo:            number;
  demanda:           number;
  tieneReceta:       boolean;
  minutosEstimados:  number | null;
};

function fmtMin(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function StockBadge({ stock, minimo }: { stock: number; minimo: number }) {
  if (minimo === 0) {
    return <span className="text-sm font-semibold tabular-nums text-neutral-700">{stock}</span>;
  }
  if (stock === 0) {
    return <span className="text-sm font-semibold tabular-nums text-danger">0 — Sin stock</span>;
  }
  if (stock < minimo) {
    return <span className="text-sm font-semibold tabular-nums text-warning">{stock} — Bajo mínimo</span>;
  }
  return <span className="text-sm font-semibold tabular-nums text-success">{stock} — OK</span>;
}

function LoteForm({ item, onClose }: { item: StockItem; onClose: () => void }) {
  const [mode, setMode]           = useState<"lote" | "ajuste">("lote");
  const [isPending, startTrans]   = useTransition();
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const sugerido = Math.max(item.minimo - item.stock + item.demanda, 1);

  function handle(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSuccess(null);
    const fd = new FormData(e.currentTarget);
    startTrans(async () => {
      try {
        if (mode === "lote") {
          await registrarLote(fd);
          setSuccess("Lote registrado. Stock actualizado.");
        } else {
          await ajustarStock(fd);
          setSuccess("Stock ajustado.");
        }
      } catch (err: any) {
        setError(err.message ?? "Error");
      }
    });
  }

  const inputCls = "px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

  return (
    <div className="mt-2 p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
      <div className="flex gap-2 items-center">
        <button type="button" onClick={() => { setMode("lote"); setError(null); setSuccess(null); }}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === "lote" ? "bg-tierra-700 text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
          Registrar lote producido
        </button>
        <button type="button" onClick={() => { setMode("ajuste"); setError(null); setSuccess(null); }}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === "ajuste" ? "bg-tierra-700 text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
          Ajuste de inventario
        </button>
        <button type="button" onClick={onClose} className="ml-auto text-xs text-neutral-400 hover:text-neutral-700">✕</button>
      </div>

      <form onSubmit={handle} className="flex items-end gap-3 flex-wrap">
        <input type="hidden" name="product_id" value={item.id} />
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            {mode === "lote" ? "Cajas producidas" : "Stock actual (nuevo valor)"}
          </label>
          <input
            name="qty"
            type="number"
            min={mode === "lote" ? 1 : 0}
            defaultValue={mode === "lote" ? sugerido : item.stock}
            required
            className={`${inputCls} w-28`}
            disabled={isPending}
          />
        </div>
        {mode === "ajuste" && (
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Stock mínimo deseado</label>
            <input
              name="minimo"
              type="number"
              min={0}
              defaultValue={item.minimo}
              className={`${inputCls} w-28`}
              disabled={isPending}
            />
          </div>
        )}
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Notas (opcional)</label>
          <input name="notes" placeholder={mode === "lote" ? "Lote matutino…" : "Conteo físico…"} className={`${inputCls} w-full`} disabled={isPending} />
        </div>
        <button type="submit" disabled={isPending}
          className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : mode === "lote" ? "Registrar lote" : "Ajustar stock"}
        </button>
      </form>

      {mode === "lote" && item.demanda > 0 && (
        <p className="text-xs text-neutral-500">
          Hay <strong>{item.demanda} cajas</strong> comprometidas en pedidos activos.
          {item.minimo > 0 && ` Mínimo deseado: ${item.minimo}.`}
          {" "}Sugerido a producir: <strong>{sugerido} cajas</strong>.
        </p>
      )}

      {error   && <p className="text-xs text-danger">{error}</p>}
      {success && <p className="text-xs text-success">{success}</p>}
    </div>
  );
}

function ProductCard({
  item, open, onToggle, highlight,
}: {
  item: StockItem; open: boolean; onToggle: () => void; highlight: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border p-4 ${highlight ? "border-warning/30 bg-warning-bg/20" : "border-neutral-200"}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 leading-tight">{item.name}</p>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            {item.sku}{item.bolsas_caja ? ` · ${item.bolsas_caja}u/caja` : ""}
          </p>
        </div>
        <StockBadge stock={item.stock} minimo={item.minimo} />
      </div>
      <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3">
        {item.minimo > 0 && <span>Mín: <strong className="text-neutral-700">{item.minimo}</strong></span>}
        {item.demanda > 0 && <span>Comprometido: <strong className="text-tierra-700">{item.demanda}</strong></span>}
        {item.minutosEstimados != null && <span>⏱ {fmtMin(item.minutosEstimados)}</span>}
      </div>
      <button
        onClick={onToggle}
        className="w-full py-2 text-xs font-medium rounded-xl bg-tierra-700 text-white hover:bg-tierra-800 transition-colors"
      >
        {open ? "Cancelar" : "+ Registrar lote / ajustar stock"}
      </button>
      {open && (
        <div className="mt-3">
          <LoteForm item={item} onClose={onToggle} />
        </div>
      )}
    </div>
  );
}

export function CocinaClient({ items }: { items: StockItem[] }) {
  const [openId, setOpenId]   = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("todas");
  const [showAll, setShowAll] = useState(false);

  const categorias = useMemo(() => Array.from(new Set(items.map((i) => i.categoria))).sort(), [items]);

  const filtered = items
    .filter((i) => filterCat === "todas" || i.categoria === filterCat)
    .sort((a, b) => {
      // Prioridad: sin stock > bajo mínimo > OK > sin mínimo configurado
      const urgA = a.minimo === 0 ? 3 : a.stock === 0 ? 0 : a.stock < a.minimo ? 1 : 2;
      const urgB = b.minimo === 0 ? 3 : b.stock === 0 ? 0 : b.stock < b.minimo ? 1 : 2;
      if (urgA !== urgB) return urgA - urgB;
      return a.name.localeCompare(b.name);
    });

  const urgentes = filtered.filter((i) => i.minimo > 0 && i.stock < i.minimo);
  const resto    = filtered.filter((i) => i.minimo === 0 || i.stock >= i.minimo);

  const alertaTotal   = items.filter((i) => i.minimo > 0 && i.stock < i.minimo).length;
  const minTotalUrgente = urgentes.reduce((s, i) => s + (i.minutosEstimados ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Planificador rápido */}
      {alertaTotal > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 md:p-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Plan del día</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <p className="text-xs text-neutral-400">Productos a producir</p>
              <p className="text-2xl font-semibold font-display text-warning">{alertaTotal}</p>
            </div>
            {minTotalUrgente > 0 && (
              <div>
                <p className="text-xs text-neutral-400">Tiempo estimado total</p>
                <p className="text-2xl font-semibold font-display text-neutral-900">{fmtMin(minTotalUrgente)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-400">Prioridad</p>
              <p className="text-sm font-medium text-neutral-700 mt-1">
                {urgentes[0]?.name ?? "—"}
              </p>
            </div>
          </div>
          {urgentes.some((i) => !i.tieneReceta) && (
            <p className="mt-3 text-xs text-neutral-400">
              Algunos productos no tienen receta —{" "}
              <a href="/admin/cocina/recetas" className="text-tierra-700 hover:underline">cargalas acá</a>{" "}
              para ver el tiempo estimado.
            </p>
          )}
        </div>
      )}

      {/* Filtros — scroll horizontal en mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1 w-max md:w-fit">
          <button onClick={() => setFilterCat("todas")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterCat === "todas" ? "bg-tierra-700 text-white" : "text-neutral-500 hover:text-neutral-800"}`}>
            Todas
          </button>
          {categorias.map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterCat === cat ? "bg-tierra-700 text-white" : "text-neutral-500 hover:text-neutral-800"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile: cards ──────────────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {urgentes.length === 0 && resto.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-xs text-neutral-400">
            Sin productos activos.
          </div>
        ) : (
          <>
            {urgentes.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                highlight
              />
            ))}
            {(showAll ? resto : resto.slice(0, 8)).map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                highlight={false}
              />
            ))}
            {resto.length > 8 && (
              <button onClick={() => setShowAll(!showAll)} className="w-full py-2 text-xs text-tierra-700 hover:underline">
                {showAll ? "Mostrar menos" : `Ver ${resto.length - 8} más`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Desktop: tabla ─────────────────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Stock actual</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Mínimo</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Comprometido</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Tiempo est.</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {urgentes.length === 0 && resto.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-neutral-400 text-xs">
                  Sin productos activos. Cargá productos desde el panel de Productos.
                </td>
              </tr>
            )}
            {urgentes.map((item) => (
              <ProductRow
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                highlight
              />
            ))}
            {(showAll ? resto : resto.slice(0, 8)).map((item) => (
              <ProductRow
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                highlight={false}
              />
            ))}
          </tbody>
        </table>

        {resto.length > 8 && (
          <div className="px-5 py-3 border-t border-neutral-100">
            <button onClick={() => setShowAll(!showAll)} className="text-xs text-tierra-700 hover:underline">
              {showAll ? "Mostrar menos" : `Ver ${resto.length - 8} más`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({
  item, open, onToggle, highlight,
}: {
  item: StockItem; open: boolean; onToggle: () => void; highlight: boolean;
}) {
  return (
    <>
      <tr className={`hover:bg-neutral-50 transition-colors ${highlight ? "bg-warning-bg/30" : ""}`}>
        <td className="px-5 py-3">
          <p className="font-medium text-neutral-900">{item.name}</p>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            {item.sku}{item.bolsas_caja ? ` · ${item.bolsas_caja} u/caja` : ""}
          </p>
        </td>
        <td className="px-5 py-3 text-center">
          <StockBadge stock={item.stock} minimo={item.minimo} />
        </td>
        <td className="px-5 py-3 text-center text-sm text-neutral-500 tabular-nums">
          {item.minimo > 0 ? item.minimo : <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-5 py-3 text-center text-sm tabular-nums">
          {item.demanda > 0
            ? <span className="font-medium text-tierra-700">{item.demanda}</span>
            : <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-5 py-3 text-center text-xs text-neutral-500">
          {item.minutosEstimados != null
            ? <span className="font-medium text-neutral-700">{fmtMin(item.minutosEstimados)}</span>
            : item.tieneReceta
              ? <span className="text-neutral-300">—</span>
              : <a href="/admin/cocina/recetas" className="text-neutral-300 hover:text-tierra-700 underline underline-offset-2">Sin receta</a>
          }
        </td>
        <td className="px-5 py-3 text-right">
          <button
            onClick={onToggle}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 transition-colors"
          >
            {open ? "Cancelar" : "+ Registrar"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-5 pb-4">
            <LoteForm item={item} onClose={onToggle} />
          </td>
        </tr>
      )}
    </>
  );
}
