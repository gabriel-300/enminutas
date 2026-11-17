import type { Metadata } from "next";
import { getProducts } from "@/lib/data/products";
import { groupProductsByLine } from "@/lib/data/product-lines";
import { CatalogView } from "@/components/site/catalog/catalog-view";

export const metadata: Metadata = {
  title: "Catálogo de productos",
  description:
    "Ultracongelados a base de mandioca para gastronomía y distribuidores. Listos en 12 minutos, cero mermas. Envíos a todo el país.",
};

export const revalidate = 600;

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ linea?: string }>;
}) {
  const [{ linea }, products] = await Promise.all([searchParams, getProducts(undefined, true)]);
  const groups = groupProductsByLine(products);

  return <CatalogView groups={groups} initialLine={linea} />;
}
