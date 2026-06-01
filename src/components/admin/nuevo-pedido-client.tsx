"use client";

import { useState, useMemo, useTransition } from "react";
import { calcPrecio, margenParaCanal, type PrecioB2B } from "@/lib/b2b-pricing";
import { crearPedidoAdmin } from "@/app/(admin)/admin/pedidos/nuevo/actions";

// ── Types ──────────────────────────────────────────────────────────────────

type ClienteB2B = {
  id:        string;
  full_name: string | null;
  canal:     string;
  zona_id:   string | null;
  zona_name: string;
  flete_kg:  number;
};

type ProductoRaw = {
  id:            string;
  sku:           string;
  name:          string;
  unit_label:    string | null;
  bolsas_caja:   number | null;
  kg_caja:       number | null;
  costo:         number | null;
  pkg_unitario:  number | null;
  pkg_bulto:     number | null;
  margen_dist:   number | null;
  margen_gastro: number | null;
  margen_min:    number | null;
  mult_bolsas:   boolean | null;
  categoria:     string;
};

type ProductoConPrecio = ProductoRaw & { precio: PrecioB2B | null };

// ── Helpers ────────────────────────────────────────────────────────────────

const CANAL_LABEL: Record<string, string> = {
  dist:   "Distribuidor",
  gastro: "Gastronomía",
  min:    "Minorista",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);

// ── Main component ─────────────────────────────────────────────────────────

type VolumeTier = { minCajas: number; descuentoPct: number; label: string };

export function NuevoPedidoClient({
  clientes,
  productosRaw,
  clienteInit = null,
  itemsInit   = {},
  esAdmin     = false,
  tiers       = [],
}: {
  clientes:      ClienteB2B[];
  productosRaw:  ProductoRaw[];
  clienteInit?:  string | null;
  itemsInit?:    Record<string, number>;
  esAdmin?:      boolean;
  tiers?:        VolumeTier[];
}) {
  const [clienteId,     setClienteId]     = useState(clienteInit ?? "");
  const [cart,          setCart]          = useState<Record<string, number>>(itemsInit);
  const [notes,         setNotes]         = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [initialStatus, setInitialStatus] = useState(esAdmin ? "aprobado" : "pending_payment");
  const [filterCat,     setFilterCat]     = useState("todas");
  const [search,        setSearch]        = useState("");
  const [error,         setError]         = useState<string | null>(null);
  const [isPending,     startTransition]  = useTransition();

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;

  // Calcular precios según el cliente seleccionado
  const productos: ProductoConPrecio[] = useMemo(() => {
    if (!cliente) return productosRaw.map((p) => ({ ...p, precio: null }));
    return productosRaw.map((p) => ({
      ...p,
      precio: calcPrecio(
        p.costo, p.kg_caja, p.bolsas_caja,
        p.pkg_unitario, p.pkg_bulto, p.mult_bolsas,
        margenParaCanal(cliente.canal, p.margen_dist, p.margen_gastro, p.margen_min),
        cliente.flete_kg,
      ),
    }));
  }, [cliente, productosRaw]);

  const categorias = useMemo(
    () => Array.from(new Set(productosRaw.map((p) => p.categoria))).sort(),
    [productosRaw],
  );

  const filtered = productos.filter((p) => {
    if (filterCat !== "todas" && p.categoria !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Carrito
  function setQty(productId: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: qty };
    });
  }

  const cartItems = productos.filter((p) => (cart[p.id] ?? 0) > 0 && p.precio);
  const subtotal  = cartItems.reduce((s, p) => s + p.precio!.total_civa * cart[p.id], 0);
  const totalQty  = cartItems.reduce((s, p) => s + cart[p.id], 0);

  // Descuento por volumen: aplicar el tier más alto que aplica
  const tierAplicado = [...tiers]
    .sort((a, b) => b.minCajas - a.minCajas)
    .find((t) => totalQty >= t.minCajas) ?? null;
  const descuentoPct    = tierAplicado?.descuentoPct ?? 0;
  const montoDescuento  = Math.round(subtotal * descuentoPct / 100 * 100) / 100;
  const totalConDesc    = subtotal - montoDescuento;

  function handleSubmit() {
    if (!cliente) { setError("Seleccioná un cliente."); return; }
    if (cartItems.length === 0) { setError("Agregá al menos un producto."); return; }
    setError(null);

    const items = cartItems.map((p) => ({
      productId:  p.id,
      name:       p.name,
      unitLabel:  p.unit_label,
      bolsasCaja: p.bolsas_caja,
      precio:     p.precio!,
      quantity:   cart[p.id],
    }));

    startTransition(async () => {
      try {
        await crearPedidoAdmin({
          clientId:      cliente.id,
          canal:         cliente.canal,
          zonaId:        cliente.zona_id,
          items,
          notes,
          paymentMethod,
          initialStatus,
          discountPct:    descuentoPct,
          discountAmount: montoDescuento,
        });
      } catch (e: any) {
        setError(e.message ?? "Error al crear el pedido.");
      }
    });
  }

  return (
    <div className="flex gap-6 items-start">

      {/* ── Columna izquierda: selector + catálogo ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Selector de cliente */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <label className="block text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wide">
            Cliente B2B *
          </label>
          <select
            value={clienteId}
            onChange={(e) => { setClienteId(e.target.value); setCart({}); }}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          >
            <option value="">Seleccionar cliente…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? c.id.slice(0, 8)} — {CANAL_LABEL[c.canal] ?? c.canal} · {c.zona_name}
              </option>
            ))}
          </select>

          {cliente && (
            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
              <span className="px-2 py-0.5 bg-info-bg text-info rounded-full font-medium">
                {CANAL_LABEL[cliente.canal] ?? cliente.canal}
              </span>
              <span>{cliente.zona_name}</span>
              {cliente.flete_kg > 0 && (
                <span>Flete: {fmt(cliente.flete_kg)}/kg</span>
              )}
            </div>
          )}
        </div>

        {/* Filtros catálogo */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
            <button
              onClick={() => setFilterCat("todas")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCat === "todas" ? "bg-tierra-700 text-white" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              Todas
            </button>
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCat === cat ? "bg-tierra-700 text-white" : "text-neutral-500 hover:text-neutral-800"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          />
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-4 py-3 font-medium text-neutral-500">Producto</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-right">Precio c/IVA por caja</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-center w-36">Cantidad</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-right w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-neutral-400">
                    No hay productos.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const qty = cart[p.id] ?? 0;
                const hasPrice = !!p.precio && !!cliente;
                return (
                  <tr key={p.id} className={`hover:bg-neutral-50 transition-colors ${qty > 0 ? "bg-crema-50" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{p.name}</p>
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">
                        {p.sku} · {p.unit_label}
                        {p.bolsas_caja ? ` · ${p.bolsas_caja} u/caja` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-800">
                      {hasPrice ? fmt(p.precio!.total_civa) : (
                        <span className="text-neutral-300 text-xs">
                          {cliente ? "Sin datos B2B" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasPrice ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setQty(p.id, qty - 1)}
                            disabled={qty === 0}
                            className="size-7 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-30 transition-colors flex items-center justify-center font-semibold text-base leading-none"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">
                            {qty || ""}
                          </span>
                          <button
                            onClick={() => setQty(p.id, qty + 1)}
                            className="size-7 rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 transition-colors flex items-center justify-center font-semibold text-base leading-none"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <p className="text-center text-neutral-300 text-xs">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
                      {qty > 0 && p.precio ? fmt(p.precio.total_civa * qty) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Columna derecha: resumen + formulario ── */}
      <div className="w-80 shrink-0 space-y-4 sticky top-8">

        {/* Resumen del pedido */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-800">Resumen del pedido</p>
          </div>

          {cartItems.length === 0 ? (
            <p className="px-5 py-6 text-sm text-neutral-400 text-center">
              Seleccioná un cliente y agregá productos.
            </p>
          ) : (
            <div className="px-5 py-4 space-y-2">
              {cartItems.map((p) => (
                <div key={p.id} className="flex justify-between items-start text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-800 truncate">{p.name}</p>
                    <p className="text-xs text-neutral-400">{cart[p.id]} caja{cart[p.id] !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="tabular-nums font-medium text-neutral-900 shrink-0">
                    {fmt(p.precio!.total_civa * cart[p.id])}
                  </span>
                </div>
              ))}

              <div className="pt-3 border-t border-neutral-100 space-y-1.5">
                {/* Banner descuento por volumen */}
                {tierAplicado && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-success-bg border border-success/20 text-success text-xs font-medium">
                    <span>🎉 {tierAplicado.label}</span>
                    <span className="tabular-nums">− {fmt(montoDescuento)}</span>
                  </div>
                )}
                {/* Próximo tier disponible */}
                {!tierAplicado && tiers.length > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500">
                    {(() => {
                      const nextTier = [...tiers].sort((a, b) => a.minCajas - b.minCajas).find(t => totalQty < t.minCajas);
                      return nextTier
                        ? `Sumá ${nextTier.minCajas - totalQty} caja${nextTier.minCajas - totalQty !== 1 ? "s" : ""} más y obtenés ${nextTier.descuentoPct}% off`
                        : null;
                    })()}
                  </div>
                )}
                {tierAplicado && (
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums line-through">{fmt(subtotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-neutral-900">
                  <span>Total c/IVA</span>
                  <span className="tabular-nums">{fmt(tierAplicado ? totalConDesc : subtotal)}</span>
                </div>
                <p className="text-xs text-neutral-400">{totalQty} caja{totalQty !== 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
        </div>

        {/* Opciones del pedido */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
          {esAdmin && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Estado inicial</label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
              >
                <option value="aprobado">Aprobado (va directo a producción)</option>
                <option value="pending_payment">Pendiente de pago (espera confirmación)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Forma de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
            >
              <option value="transferencia">Transferencia bancaria</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="cuenta_corriente">Cuenta corriente</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Notas internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pedido recibido por WhatsApp, acordado con…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 resize-none"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-danger-bg border border-danger/20 rounded-xl text-sm text-danger">
            {error}
          </div>
        )}

        {/* Botón */}
        <button
          onClick={handleSubmit}
          disabled={isPending || !cliente || cartItems.length === 0}
          className="w-full py-3 rounded-xl bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-40 transition-colors"
        >
          {isPending
            ? "Creando pedido…"
            : cartItems.length > 0
            ? `Crear pedido · ${fmt(tierAplicado ? totalConDesc : subtotal)}`
            : "Crear pedido"}
        </button>

        <a
          href="/admin/pedidos"
          className="block w-full py-2 text-center text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </div>
  );
}
