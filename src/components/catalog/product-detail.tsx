"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Snowflake,
  ChevronLeft,
  Flame,
  Clock,
  Package,
  Plus,
  Minus,
} from "lucide-react";
import type { Product } from "@/lib/data/products";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { Button, Badge } from "@/components/ui";

export function ProductDetail({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const allImages  = [product.cover_image_url, ...(product.extra_images ?? [])].filter(Boolean) as string[];
  const [activeImg, setActiveImg] = useState<string | null>(allImages[0] ?? null);

  function handleAdd() {
    addItem({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price_b2c,
      quantity: qty,
      unitLabel: product.unit_label,
      imageUrl: product.cover_image_url,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/tienda" className="hover:text-neutral-700 flex items-center gap-1 transition-colors">
          <ChevronLeft className="size-3.5" /> Catálogo
        </Link>
        <span>/</span>
        <Link
          href={`/tienda?categoria=${product.category.slug}`}
          className="hover:text-neutral-700 transition-colors"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-neutral-600 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        {/* Galería */}
        <div className="sticky top-24 flex flex-col gap-3">
          {/* Imagen principal */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-crema-100">
            {activeImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeImg} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Snowflake className="size-16 stroke-1 text-tierra-400" />
                <p className="font-mono text-xs uppercase tracking-widest text-tierra-400">Foto del producto</p>
              </div>
            )}
            {product.freezer_required && (
              <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-xs font-medium px-3 py-1.5 rounded-full text-neutral-700 shadow-sm">
                <Snowflake className="size-3.5 text-blue-500" />
                Conservar en freezer
              </div>
            )}
          </div>

          {/* Miniaturas */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(img)}
                  className={`size-16 shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${
                    activeImg === img ? "border-tierra-700" : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline">{product.category.name}</Badge>
            <span className="font-mono text-xs text-neutral-400">{product.sku}</span>
          </div>

          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-neutral-900 leading-tight">
            {product.name}
          </h1>

          {product.short_description && (
            <p className="mt-3 text-lg text-neutral-500 leading-relaxed">
              {product.short_description}
            </p>
          )}

          {/* Precio */}
          <div className="mt-6 flex items-end gap-3">
            <p className="font-display text-4xl font-semibold text-neutral-900">
              {formatCurrency(product.price_b2c)}
            </p>
            <p className="text-sm text-neutral-400 pb-1">{product.unit_label}</p>
          </div>

          {product.weight_grams && (
            <p className="text-xs text-neutral-400 mt-1">
              {product.weight_grams >= 1000
                ? `${(product.weight_grams / 1000).toFixed(1)} kg`
                : `${product.weight_grams} g`}
            </p>
          )}

          {/* Qty + CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <div className="flex items-center border border-neutral-300 rounded-full overflow-hidden bg-white h-11">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-4 h-full flex items-center justify-center hover:bg-neutral-50 transition-colors"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-10 text-center font-semibold text-neutral-900">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="px-4 h-full flex items-center justify-center hover:bg-neutral-50 transition-colors"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <Button
              variant="gold"
              size="lg"
              onClick={handleAdd}
              className="flex-1"
            >
              <ShoppingCart className="size-4" />
              {added ? "¡Agregado!" : "Agregar al carrito"}
            </Button>
          </div>

          {/* Métodos de cocción */}
          {product.cooking_methods.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-2">
                <Flame className="size-3.5" /> Cómo prepararlo
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.cooking_methods.map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center gap-1.5 bg-crema-100 border border-neutral-200 text-sm text-neutral-700 px-3 py-1.5 rounded-full"
                  >
                    <Clock className="size-3.5 text-tierra-600" />
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descripción completa */}
          {product.description && (
            <div className="mt-8 border-t border-neutral-100 pt-6">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-2">
                <Package className="size-3.5" /> Descripción
              </h3>
              <div className="prose prose-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Info mayorista */}
          <div className="mt-8 rounded-xl bg-selva-700/8 border border-selva-700/15 p-4 flex gap-3">
            <div className="size-8 rounded-lg bg-selva-700 flex items-center justify-center shrink-0">
              <Package className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-selva-700">¿Comprás en volumen?</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Precio mayorista:{" "}
                <strong>{formatCurrency(product.price_b2b)}</strong> / {product.unit_label}.
                Mínimo {product.min_quantity_b2b} unidades.{" "}
                <Link href="/registro-mayorista" className="text-selva-700 underline underline-offset-2">
                  Registrate como mayorista →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
