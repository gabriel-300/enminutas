import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { RecetaEditor } from "@/components/admin/receta-editor";

export const metadata: Metadata = { title: "Editor de receta — Admin En Minutas" };
export const revalidate = 0;

export default async function RecetaEditorPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: product }, { data: recipeRaw }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, unit_label, bolsas_caja")
      .eq("id", productId)
      .single(),

    adminClient
      .from("recipes")
      .select(`
        id, yield_cajas, notes,
        steps:recipe_steps (id, step_order, description, minutes, notes),
        ingredients:recipe_ingredients (id, nombre, cantidad, unidad)
      `)
      .eq("product_id", productId)
      .maybeSingle(),
  ]);

  if (!product) notFound();

  const recipe = recipeRaw
    ? {
        yieldCajas: recipeRaw.yield_cajas,
        notes:      recipeRaw.notes ?? "",
        steps: ((recipeRaw.steps ?? []) as any[])
          .sort((a, b) => a.step_order - b.step_order)
          .map((s) => ({
            description: s.description,
            minutes:     Number(s.minutes),
            notes:       s.notes ?? "",
          })),
        ingredients: ((recipeRaw.ingredients ?? []) as any[]).map((ing) => ({
          nombre:   ing.nombre,
          cantidad: Number(ing.cantidad),
          unidad:   ing.unidad,
        })),
      }
    : null;

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/cocina/recetas" className="text-sm text-neutral-400 hover:text-neutral-700 mb-4 inline-block">
        ← Recetas
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">{product.name}</h1>
        <p className="text-sm text-neutral-400 font-mono mt-1">
          {product.sku}{product.bolsas_caja ? ` · ${product.bolsas_caja} u/caja` : ""}
        </p>
      </div>

      <RecetaEditor productId={productId} recipe={recipe} />
    </div>
  );
}
