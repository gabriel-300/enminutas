import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CategoriasClient } from "@/components/admin/categorias-client";

export const metadata: Metadata = { title: "Categorías — Admin En Minutas" };
export const revalidate = 0;

export default async function AdminCategoriasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: categorias, error },
    { data: productCounts },
  ] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("products").select("category_id").not("category_id", "is", null),
  ]);

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar categorías: {error.message}
      </div>
    );
  }

  const countMap: Record<string, number> = {};
  for (const p of (productCounts ?? [])) {
    const cid = (p as any).category_id;
    if (cid) countMap[cid] = (countMap[cid] ?? 0) + 1;
  }

  const lista = (categorias ?? []).map((c) => ({
    ...c,
    product_count: countMap[c.id] ?? 0,
  }));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Categorías</h1>
        <p className="text-sm text-neutral-500 mt-1">{lista.length} categoría{lista.length !== 1 ? "s" : ""}</p>
      </div>
      <CategoriasClient categorias={lista} />
    </div>
  );
}
