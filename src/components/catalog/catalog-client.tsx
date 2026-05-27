"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { Category, Product } from "@/lib/data/products";
import { ProductCard } from "./product-card";
import { cn } from "@/lib/utils";

interface CatalogClientProps {
  categories: Category[];
  products: Product[];
  initialCategory?: string;
  initialSearch?: string;
}

export function CatalogClient({
  categories,
  products,
  initialCategory,
  initialSearch,
}: CatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [activeCategory, setActiveCategory] = useState(
    initialCategory ?? "todos"
  );
  const [search, setSearch] = useState(initialSearch ?? "");

  function handleCategory(slug: string) {
    setActiveCategory(slug);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (slug === "todos") params.delete("categoria");
      else params.set("categoria", slug);
      router.replace(`/tienda?${params.toString()}`, { scroll: false });
    });
  }

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== "todos") {
      result = result.filter((p) => p.category.slug === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, activeCategory, search]);

  const allCategories = [{ id: "todos", slug: "todos", name: "Todos" }, ...categories];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-tierra-700 mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-semibold text-neutral-900">
          Toda la mesa, en una{" "}
          <span className="text-tierra-700">grilla</span>.
        </h1>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Filtros por categoría */}
        <div className="flex gap-2 flex-wrap bg-neutral-100 p-1.5 rounded-full w-fit">
          {allCategories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => handleCategory(cat.slug)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-150",
                activeCategory === cat.slug
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              {cat.name}
              {cat.slug !== "todos" && (
                <span className="ml-1.5 text-xs text-neutral-400">
                  {products.filter((p) => p.category.slug === cat.slug).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <input
            type="search"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full sm:w-56 rounded-full border border-neutral-300 bg-white pl-9 pr-4 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-tierra-700 focus:ring-2 focus:ring-tierra-700/20 transition-all"
          />
        </div>
      </div>

      {/* Grilla de productos */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium text-neutral-600">Sin resultados para esa búsqueda.</p>
          <button
            onClick={() => { setSearch(""); handleCategory("todos"); }}
            className="mt-4 text-sm text-tierra-700 underline underline-offset-2"
          >
            Ver todos los productos
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-neutral-400 mb-4">
            {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
