"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, Snowflake, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui";
import { CheckoutProgress } from "./checkout-progress";

export function CartStep() {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-4xl mb-4">🧺</p>
        <h1 className="font-display text-2xl font-semibold text-neutral-900 mb-2">
          Tu carrito está vacío
        </h1>
        <p className="text-neutral-500 mb-6">
          Agregá productos desde el catálogo para continuar.
        </p>
        <Button variant="gold" asChild>
          <Link href="/tienda">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <CheckoutProgress current={1} />

      <h1 className="font-display text-2xl font-semibold text-neutral-900 mb-6">
        Tu carrito
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 bg-white border border-neutral-200 rounded-xl p-4"
            >
              <div className="size-16 rounded-lg bg-crema-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Snowflake className="size-6 text-tierra-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 leading-snug">{item.name}</p>
                <p className="text-sm text-neutral-400 mt-0.5">{item.unitLabel}</p>
                <p className="text-sm font-mono text-neutral-500 mt-0.5">
                  {formatCurrency(item.price)} c/u
                </p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-neutral-200 rounded-full overflow-hidden bg-neutral-50 h-8">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="px-3 h-full hover:bg-neutral-100 transition-colors"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="px-3 h-full hover:bg-neutral-100 transition-colors"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-neutral-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-1 text-neutral-300 hover:text-danger transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sticky top-24">
            <h2 className="font-semibold text-neutral-900 mb-4">Resumen del pedido</h2>

            <div className="flex flex-col gap-2 text-sm">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-neutral-600">
                  <span className="truncate max-w-[160px]">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 mt-4 pt-4 flex justify-between items-center">
              <span className="text-sm text-neutral-500">Subtotal</span>
              <span className="font-semibold text-neutral-900">{formatCurrency(subtotal())}</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">+ envío calculado en el siguiente paso</p>

            <Button variant="gold" size="lg" className="w-full mt-5" asChild>
              <Link href="/checkout/envio">
                Continuar <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
              <Link href="/tienda">← Seguir comprando</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
