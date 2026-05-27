"use client";

import Link from "next/link";
import { X, Minus, Plus, ShoppingBag, Trash2, Snowflake } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui";

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotal } =
    useCartStore();

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        className={cn(
          "fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Carrito de compras"
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="font-display text-lg font-semibold text-neutral-900">
            Tu carrito
          </h2>
          <button
            onClick={closeCart}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
            aria-label="Cerrar carrito"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-400 px-8 text-center">
              <ShoppingBag className="size-12 stroke-1" />
              <div>
                <p className="font-medium text-neutral-600">Carrito vacío</p>
                <p className="text-sm mt-1">Agregá productos desde el catálogo.</p>
              </div>
              <Link
                href="/tienda"
                onClick={closeCart}
                className="inline-flex items-center justify-center font-medium transition-all duration-150 h-9 px-4 text-sm gap-1.5 rounded-full bg-transparent text-neutral-700 border border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50"
              >
                Ver catálogo
              </Link>
            </div>
          ) : (
            <ul className="px-4 flex flex-col gap-3">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-3 p-3 rounded-xl bg-crema-50 border border-neutral-100"
                >
                  {/* Thumbnail */}
                  <div className="size-14 rounded-lg bg-crema-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Snowflake className="size-5 text-tierra-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.unitLabel}</p>

                    <div className="flex items-center justify-between mt-2">
                      {/* Qty control */}
                      <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-full px-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="size-6 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                          aria-label="Restar"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="size-6 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                          aria-label="Sumar"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-1 text-neutral-300 hover:text-danger transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-neutral-200 px-5 py-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-500">Subtotal</span>
              <span className="font-semibold text-neutral-900">
                {formatCurrency(subtotal())}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Envío calculado en el siguiente paso.
            </p>
            <Button variant="gold" size="lg" className="w-full" asChild>
              <Link href="/checkout/carrito" onClick={closeCart}>
                Ir al checkout →
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={closeCart} asChild>
              <Link href="/tienda">Seguir comprando</Link>
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
