import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/data/products";
import { groupProductsByLine } from "@/lib/data/product-lines";
import { CatalogView } from "@/components/site/catalog/catalog-view";

export const metadata: Metadata = {
  title: "Catálogo de productos",
  description:
    "Ultracongelados a base de mandioca para gastronomía y distribuidores. Listos en 12 minutos, cero mermas. Envíos a todo el país.",
};

export const revalidate = 600;

async function getWhatsapp() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contenido_web")
    .select("valor")
    .eq("clave", "contacto_whatsapp")
    .maybeSingle();
  return data?.valor || undefined;
}

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ linea?: string }>;
}) {
  const [{ linea }, products, whatsapp] = await Promise.all([
    searchParams,
    getProducts(undefined, true),
    getWhatsapp(),
  ]);

  const groups = groupProductsByLine(products);

  return <CatalogView groups={groups} whatsapp={whatsapp} initialLine={linea} />;
}
