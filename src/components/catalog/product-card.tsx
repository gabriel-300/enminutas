"use client";

import Link from "next/link";
import { Snowflake } from "lucide-react";
import type { Product } from "@/lib/data/products";
import { Badge } from "@/components/ui";

const WA_NUMBER = "5493765017944";

interface ProductCardProps {
  product: Product;
  showB2bPrice?: boolean;
}

export function ProductCard({ product }: ProductCardProps) {
  const waText = encodeURIComponent(`Hola, quería consultar sobre ${product.name} de En Minutas 🛒`);
  const waHref = `https://wa.me/${WA_NUMBER}?text=${waText}`;

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
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Consultar ${product.name} por WhatsApp`}
            className="inline-flex items-center justify-center size-10 rounded-xl text-white transition-colors hover:opacity-90"
            style={{ background: "#2C25B5" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
          </a>
        </div>
      </div>
    </Link>
  );
}
