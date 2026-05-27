import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/data/products";
import { CatalogClient } from "@/components/catalog/catalog-client";

export const metadata: Metadata = {
  title: "Catálogo de productos",
  description:
    "Chipas, empanadas, pizzas y bocaditos ultracongelados. Materia prima del Litoral, cocción Rational. Comprá online con envío a todo el país.",
};

// Revalidar cada 10 minutos para ISR en producción
export const revalidate = 600;

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}) {
  const params = await searchParams;

  // Fetch en paralelo
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  return (
    <CatalogClient
      categories={categories}
      products={products}
      initialCategory={params.categoria}
      initialSearch={params.q}
    />
  );
}
