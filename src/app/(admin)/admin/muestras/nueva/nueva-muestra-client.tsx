"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPedidoMuestra } from "./actions";

type Producto = {
  id:          string;
  name:        string;
  sku:         string | null;
  codigo:      string | null;
  presentacion: string | null;
};

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

export function NuevaMuestraClient({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);

  // Datos del destinatario
  const [destinatario, setDestinatario] = useState("");
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");
  const [notes,  setNotes]  = useState("");

  // Items seleccionados: map productId → quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch]         = useState("");

  const filtrados = search.trim()
    ? productos.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.codigo ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : productos;

  function setQty(id: string, qty: number) {
    setQuantities((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: qty };
    });
  }

  const seleccionados = productos.filter((p) => (quantities[p.id] ?? 0) > 0);
  const totalItems    = seleccionados.reduce((s, p) => s + (quantities[p.id] ?? 0), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!destinatario.trim()) { setError("Ingresá el nombre del destinatario"); return; }
    if (seleccionados.length === 0) { setError("Seleccioná al menos un producto"); return; }

    startTransition(async () => {
      const result = await crearPedidoMuestra({
        destinatario,
        email,
        phone,
        notes,
        items: seleccionados.map((p) => ({
          productId: p.id,
          name:      p.name,
          quantity:  quantities[p.id]!,
        })),
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push("/admin/muestras");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

      {/* ── Destinatario ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800">Destinatario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre / Empresa *</label>
            <input
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              placeholder="Ej: Restaurant La Esquina"
              className={inputCls}
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@empresa.com"
              className={inputCls}
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 376…"
              className={inputCls}
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Motivo / Notas</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Degustación, visita comercial…"
              className={inputCls}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* ── Productos de muestra ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Productos de muestra</h2>
          {totalItems > 0 && (
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
              {totalItems} unidad{totalItems !== 1 ? "es" : ""} seleccionada{totalItems !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {productos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-neutral-500">No hay productos habilitados para muestras.</p>
            <p className="text-xs text-neutral-400 mt-1">
              Habilitá productos desde <a href="/admin/productos" className="text-tierra-700 hover:underline">Productos → columna Muestra</a>.
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
              />
            </div>

            <div className="divide-y divide-neutral-100">
              {filtrados.map((p) => {
                const qty = quantities[p.id] ?? 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{p.name}</p>
                      {(p.codigo || p.presentacion) && (
                        <p className="text-xs text-neutral-400">
                          {[p.codigo, p.presentacion].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQty(p.id, qty - 1)}
                        disabled={qty === 0 || isPending}
                        className="w-7 h-7 rounded-full border border-neutral-200 text-neutral-500 flex items-center justify-center text-sm hover:bg-neutral-50 disabled:opacity-30 transition-colors"
                      >
                        −
                      </button>
                      <span className={`w-8 text-center text-sm font-medium ${qty > 0 ? "text-neutral-900" : "text-neutral-300"}`}>
                        {qty || "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(p.id, qty + 1)}
                        disabled={isPending}
                        className="w-7 h-7 rounded-full bg-neutral-800 text-white flex items-center justify-center text-sm hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtrados.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-400">Sin resultados</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Resumen + submit ── */}
      {seleccionados.length > 0 && (
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Resumen de la muestra</p>
          {seleccionados.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="text-neutral-700">{p.name}</span>
              <span className="font-medium text-neutral-900">{quantities[p.id]} ud.</span>
            </div>
          ))}
          <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-semibold text-neutral-800">
            <span>Total</span>
            <span className="text-success">Sin cargo</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || seleccionados.length === 0 || !destinatario.trim()}
          className="px-5 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Creando muestra…" : "Crear pedido de muestra"}
        </button>
        <a href="/admin/muestras" className="text-sm text-neutral-500 hover:text-neutral-700">Cancelar</a>
      </div>
    </form>
  );
}
