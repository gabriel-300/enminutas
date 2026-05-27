"use client";

import Link from "next/link";
import { ShoppingCart, Snowflake } from "lucide-react";
import type { Product } from "@/lib/data/products";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui";

interface ProductCardProps {
  product: Product;
  showB2bPrice?: boolean;
}

export function ProductCard({ product, showB2bPrice = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const price = showB2bPrice ? product.price_b2b : product.price_b2c;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      price,
      quantity: 1,
      unitLabel: product.unit_label,
      imageUrl: product.cover_image_url,
    });
  }

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group relative rounded-xl border border-neutral-200 bg-white overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-md"
    >
      {/* Imagen */}
      <div className="aspect-square bg-crema-100 relative overflow-hidden">
        {product.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.cover_image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-tierra-300">
            <Snowflake className="size-8 text-tierra-400" />
            <p className="font-mono text-xs uppercase tracking-wider text-tierra-400 text-center px-2">
              {product.name}
            </p>
          </div>
        )}

        {/* Badge categoría */}
        <span className="absolute top-2 left-2">
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-xs">
            {product.category.name}
          </Badge>
        </span>

        {/* Botón agregar (hover) */}
        <button
          onClick={handleAdd}
          aria-label={`Agregar ${product.name} al carrito`}
          className="absolute bottom-2 right-2 size-8 rounded-full bg-tierra-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-tierra-800 hover:scale-110 shadow-md"
        >
          <ShoppingCart className="size-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-xs font-mono text-neutral-400 uppercase tracking-wide">
          {product.sku}
        </p>
        <h3 className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            <p className="text-base font-semibold text-neutral-900">
              {formatCurrency(price)}
            </p>
            <p className="text-xs text-neutral-400">{product.unit_label}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
