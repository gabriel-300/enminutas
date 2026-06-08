"use client";

import { useReducer, useTransition, useState } from "react";
import Image from "next/image";
import { confirmarPedidoB2B } from "@/app/(b2b)/b2b/catalogo/actions";

type PrecioB2B = {
  total_civa: number;
  por_unidad: number;
};

type Producto = {
  id:               string;
  name:             string;
  unit_label:       string | null;
  bolsas_caja:      number | null;
  kg_caja:          number | null;
  cover_image_url:  string | null;
  min_quantity_b2b: number | null;
  categoria:        string;
  categoria_slug:   string;
  precio:           PrecioB2B | null;
};

type CartItem = {
  id:          string;
  name:        string;
  unit_label:  string | null;
  bolsas_caja: number | null;
  precio:      PrecioB2B;
  qty:         number;
};

type CartAction =
  | { type: "inc"; p: Producto }
  | { type: "dec"; id: string; min: number };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  if (action.type === "inc") {
    if (!action.p.precio) return items;
    const ex = items.find((i) => i.id === action.p.id);
    if (ex) return items.map((i) => i.id === action.p.id ? { ...i, qty: i.qty + 1 } : i);
    const minQty = action.p.min_quantity_b2b ?? 1;
    return [...items, {
      id:          action.p.id,
      name:        action.p.name,
      unit_label:  action.p.unit_label,
      bolsas_caja: action.p.bolsas_caja,
      precio:      action.p.precio,
      qty:         minQty,
    }];
  }
  if (action.type === "dec") {
    const ex = items.find((i) => i.id === action.id);
    if (!ex) return items;
    if (ex.qty <= action.min) return items.filter((i) => i.id !== action.id);
    return items.map((i) => i.id === action.id ? { ...i, qty: i.qty - 1 } : i);
  }
  return items;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style:                 "currency",
    currency:              "ARS",
    maximumFractionDigits: 0,
  }).format(n);

function ProductCard({
  p,
  cartQty,
  onInc,
  onDec,
}: {
  p:       Producto;
  cartQty: number;
  onInc:   () => void;
  onDec:   () => void;
}) {
  const minQty = p.min_quantity_b2b ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 flex flex-col overflow-hidden">
      {/* Imagen */}
      {p.cover_image_url ? (
        <div className="relative w-full aspect-[4/3] bg-neutral-100">
          <Image
            src={p.cover_image_url}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-neutral-50 flex items-center justify-center">
          <span className="text-3xl text-neutral-200">📦</span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-medium text-neutral-900 text-sm leading-snug">{p.name}</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {[
              p.unit_label,
              p.bolsas_caja ? `${p.bolsas_caja} u/caja` : null,
              p.kg_caja     ? `${p.kg_caja} kg/caja`    : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {minQty > 1 && (
            <p className="text-xs text-tierra-600 mt-0.5">Mín. {minQty} cajas</p>
          )}
        </div>

        {p.precio ? (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-neutral-400">Total c/IVA · por caja</p>
              <p className="text-xl font-semibold text-neutral-900 font-display tabular-nums">
                {fmt(p.precio.total_civa)}
              </p>
            </div>
            <p className="text-xs text-neutral-400 pb-0.5">
              {fmt(p.precio.por_unidad)}/u
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 italic flex-1">Precio a consultar</p>
        )}

        <div className="pt-2 border-t border-neutral-100 mt-auto">
          {p.precio ? (
            cartQty > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onDec}
                  className="size-8 rounded-lg bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center text-lg leading-none"
                >
                  −
                </button>
                <span className="text-sm font-semibold tabular-nums min-w-[1.5rem] text-center">
                  {cartQty}
                </span>
                <button
                  onClick={onInc}
                  className="size-8 rounded-lg bg-tierra-700 text-white font-medium hover:bg-tierra-800 transition-colors flex items-center justify-center text-lg leading-none"
                >
                  +
                </button>
                <span className="text-xs text-neutral-400 ml-auto">
                  {cartQty} caja{cartQty !== 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <button
                onClick={onInc}
                className="w-full py-2 rounded-xl text-sm font-medium text-tierra-700 border border-tierra-700/30 hover:bg-tierra-50 transition-colors"
              >
                + Agregar al pedido
              </button>
            )
          ) : (
            <button
              disabled
              className="w-full py-2 rounded-xl text-sm text-neutral-300 border border-neutral-100 cursor-not-allowed"
            >
              Precio a consultar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CatalogoB2BClient({ products }: { products: Producto[] }) {
  const [cart, dispatch]             = useReducer(cartReducer, []);
  const [activeCat, setActiveCat]    = useState<string>("todas");
  const [search, setSearch]          = useState("");
  const [nota, setNota]              = useState("");
  const [showNota, setShowNota]      = useState(false);
  const [isPending, startTransition] = useTransition();

  const categorias = Array.from(new Set(products.map((p) => p.categoria)));

  const filtered = products.filter((p) => {
    const matchCat  = activeCat === "todas" || p.categoria === activeCat;
    const matchText = search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  const totalQty  = cart.reduce((s, i) => s + i.qty, 0);
  const totalCiva = cart.reduce((s, i) => s + i.precio.total_civa * i.qty, 0);

  function handleConfirmar() {
    startTransition(async () => {
      await confirmarPedidoB2B(cart, nota.trim() || null);
    });
  }

  return (
    <>
      {/* Buscador */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-4 py-2 rounded-xl border border-neutral-200 text-sm bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-tierra-700/20 focus:border-tierra-700"
        />
      </div>

      {/* Filtro categorías */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6">
      <div className="flex items-center gap-2 w-max md:w-auto md:flex-wrap">
        <button
          onClick={() => setActiveCat("todas")}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCat === "todas"
              ? "bg-tierra-700 text-white"
              : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Todas
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCat === cat
                ? "bg-tierra-700 text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-16">
          No hay productos que coincidan.
        </p>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${totalQty > 0 ? "pb-48" : ""}`}>
          {filtered.map((p) => {
            const cartItem = cart.find((i) => i.id === p.id);
            const minQty   = p.min_quantity_b2b ?? 1;
            return (
              <ProductCard
                key={p.id}
                p={p}
                cartQty={cartItem?.qty ?? 0}
                onInc={() => dispatch({ type: "inc", p })}
                onDec={() => dispatch({ type: "dec", id: p.id, min: minQty })}
              />
            );
          })}
        </div>
      )}

      {/* Barra flotante del carrito — sube sobre bottom nav en mobile */}
      {totalQty > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 flex justify-center p-4">
          <div className="bg-neutral-900 text-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Nota del pedido (expandible) */}
            {showNota && (
              <div className="px-5 pt-4 pb-2 border-b border-neutral-700">
                <label className="text-xs text-neutral-400 block mb-1">
                  Nota para el pedido (opcional)
                </label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: entregar en depósito trasero, llamar antes…"
                  rows={2}
                  className="w-full bg-neutral-800 text-white text-sm rounded-xl px-3 py-2 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-tierra-700/40 resize-none"
                />
              </div>
            )}

            <div className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {totalQty} caja{totalQty !== 1 ? "s" : ""} · {fmt(totalCiva)}
                </p>
                <p className="text-xs text-neutral-400">Total c/IVA incluido</p>
              </div>
              <button
                onClick={() => setShowNota(!showNota)}
                className="text-neutral-400 hover:text-white transition-colors text-xs shrink-0"
                title="Agregar nota"
              >
                {showNota ? "✕ nota" : "📝 nota"}
              </button>
              <button
                onClick={handleConfirmar}
                disabled={isPending}
                className="bg-tierra-700 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-tierra-800 disabled:opacity-60 transition-colors shrink-0"
              >
                {isPending ? "Procesando…" : "Confirmar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
