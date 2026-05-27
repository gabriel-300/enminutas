"use client";

import { useReducer, useTransition, useState } from "react";
import { confirmarPedidoB2B } from "@/app/(b2b)/b2b/catalogo/actions";

type PrecioB2B = {
  lista_siva: number;
  comision:   number;
  flete:      number;
  total_siva: number;
  total_civa: number;
};

type Producto = {
  id:             string;
  name:           string;
  unit_label:     string | null;
  bolsas_caja:    number | null;
  kg_caja:        number | null;
  categoria:      string;
  categoria_slug: string;
  precio:         PrecioB2B | null;
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
  | { type: "dec"; id: string };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  if (action.type === "inc") {
    if (!action.p.precio) return items;
    const ex = items.find((i) => i.id === action.p.id);
    if (ex) return items.map((i) => i.id === action.p.id ? { ...i, qty: i.qty + 1 } : i);
    return [...items, {
      id:          action.p.id,
      name:        action.p.name,
      unit_label:  action.p.unit_label,
      bolsas_caja: action.p.bolsas_caja,
      precio:      action.p.precio,
      qty:         1,
    }];
  }
  if (action.type === "dec") {
    const ex = items.find((i) => i.id === action.id);
    if (!ex) return items;
    if (ex.qty <= 1) return items.filter((i) => i.id !== action.id);
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
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col gap-3">
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
      </div>

      {p.precio ? (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-neutral-400">Total c/IVA</p>
              <p className="text-xl font-semibold text-neutral-900 font-display tabular-nums">
                {fmt(p.precio.total_civa)}
              </p>
            </div>
            <button
              onClick={() => setOpen(!open)}
              className="text-xs text-tierra-700 hover:underline pb-0.5"
            >
              {open ? "Ocultar" : "Desglose"}
            </button>
          </div>

          {open && (
            <div className="bg-neutral-50 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Lista s/IVA</span>
                <span className="tabular-nums">{fmt(p.precio.lista_siva)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Comisión (15%)</span>
                <span className="tabular-nums">{fmt(p.precio.comision)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Flete</span>
                <span className="tabular-nums">{fmt(p.precio.flete)}</span>
              </div>
              <div className="flex justify-between font-medium text-neutral-800 pt-1 border-t border-neutral-200">
                <span>Total s/IVA</span>
                <span className="tabular-nums">{fmt(p.precio.total_siva)}</span>
              </div>
              <div className="flex justify-between font-semibold text-tierra-700">
                <span>Total c/IVA (21%)</span>
                <span className="tabular-nums">{fmt(p.precio.total_civa)}</span>
              </div>
            </div>
          )}
        </>
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
  );
}

export function CatalogoB2BClient({ products }: { products: Producto[] }) {
  const [cart, dispatch]          = useReducer(cartReducer, []);
  const [activeCat, setActiveCat] = useState<string>("todas");
  const [isPending, startTransition] = useTransition();

  const categorias = Array.from(new Set(products.map((p) => p.categoria)));

  const filtered =
    activeCat === "todas"
      ? products
      : products.filter((p) => p.categoria === activeCat);

  const totalQty  = cart.reduce((s, i) => s + i.qty, 0);
  const totalCiva = cart.reduce((s, i) => s + i.precio.total_civa * i.qty, 0);

  function handleConfirmar() {
    startTransition(async () => {
      await confirmarPedidoB2B(cart);
    });
  }

  return (
    <>
      {/* Filtro categorías */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-16">
          No hay productos disponibles.
        </p>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${totalQty > 0 ? "pb-28" : ""}`}>
          {filtered.map((p) => {
            const cartItem = cart.find((i) => i.id === p.id);
            return (
              <ProductCard
                key={p.id}
                p={p}
                cartQty={cartItem?.qty ?? 0}
                onInc={() => dispatch({ type: "inc", p })}
                onDec={() => dispatch({ type: "dec", id: p.id })}
              />
            );
          })}
        </div>
      )}

      {/* Barra flotante del carrito */}
      {totalQty > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center p-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl w-full max-w-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {totalQty} caja{totalQty !== 1 ? "s" : ""} · {fmt(totalCiva)}
              </p>
              <p className="text-xs text-neutral-400">Total c/IVA incluido</p>
            </div>
            <button
              onClick={handleConfirmar}
              disabled={isPending}
              className="bg-tierra-700 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-tierra-800 disabled:opacity-60 transition-colors shrink-0"
            >
              {isPending ? "Procesando…" : "Confirmar pedido"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
