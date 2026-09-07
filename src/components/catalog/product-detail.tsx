"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Snowflake,
  ChevronLeft,
  Flame,
  Clock,
  Package,
} from "lucide-react";
import type { Product } from "@/lib/data/products";
import { Badge } from "@/components/ui";

const WA_NUMBER = "5493765017944";

export function ProductDetail({ product }: { product: Product }) {
  const allImages = [product.cover_image_url, ...(product.extra_images ?? [])].filter(Boolean) as string[];
  const [activeImg, setActiveImg] = useState<string | null>(allImages[0] ?? null);

  const waText = encodeURIComponent(`Hola, quería consultar sobre ${product.name} de En Minutas 🛒`);
  const waHref = `https://wa.me/${WA_NUMBER}?text=${waText}`;

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
          <div className="mb-3">
            <Badge variant="outline">{product.category.name}</Badge>
          </div>

          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-neutral-900 leading-tight">
            {product.name}
          </h1>

          {product.short_description && (
            <p className="mt-3 text-lg text-neutral-500 leading-relaxed">
              {product.short_description}
            </p>
          )}

          {/* CTA WhatsApp */}
          <div className="mt-8">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Consultar por WhatsApp"
              className="inline-flex items-center justify-center size-14 rounded-xl text-white transition-colors hover:opacity-90"
              style={{ background: "#2C25B5" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
            </a>
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
        </div>
      </div>
    </div>
  );
}
