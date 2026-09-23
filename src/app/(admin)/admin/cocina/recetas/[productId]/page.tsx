import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { RecetaEditor } from "@/components/admin/receta-editor";
import {
  PresentacionesReceta,
  type PresentacionVinculada,
  type ProductoVinculable,
} from "@/components/admin/presentaciones-receta";
import { factorABase, cajasPorLote } from "@/lib/receta-base";

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

  const [{ data: product }, { data: recipeRaw }, { data: insumosRaw }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, unit_label, bolsas_caja, kg_caja, receta_producto_id")
      .eq("id", productId)
      .single(),

    adminClient
      .from("recipes")
      .select("id, yield_cajas, vida_util_dias, notes, steps:recipe_steps (id, step_order, description, minutes, notes)")
      .eq("product_id", productId)
      .maybeSingle(),

    adminClient
      .from("insumos")
      .select("id, nombre, unidad, precio_unitario")
      .order("nombre"),
  ]);

  if (!product) notFound();

  // Una presentación no tiene receta propia: se edita en el producto base
  if (product.receta_producto_id) redirect(`/admin/cocina/recetas/${product.receta_producto_id}`);

  // Presentaciones vinculadas y productos que se podrían vincular (solo si ya hay receta)
  let vinculadas: PresentacionVinculada[] = [];
  let candidatos: ProductoVinculable[] = [];
  if (recipeRaw?.id) {
    const factorDe = (kg: number | string | null) => factorABase(kg, product.kg_caja);
    const [{ data: linked }, { data: activos }, { data: conReceta }] = await Promise.all([
      adminClient
        .from("products")
        .select("id, name, sku, unit_label, kg_caja")
        .eq("receta_producto_id", productId)
        .order("name"),
      adminClient
        .from("products")
        .select("id, name, sku, unit_label, kg_caja, receta_producto_id")
        .eq("is_active", true)
        .is("receta_producto_id", null)
        .neq("id", productId)
        .order("name"),
      adminClient.from("recipes").select("product_id"),
    ]);
    vinculadas = ((linked ?? []) as any[]).map((p) => ({
      id: p.id, name: p.name, sku: p.sku, unit_label: p.unit_label,
      kg_caja:      p.kg_caja !== null ? Number(p.kg_caja) : null,
      cajasPorLote: cajasPorLote(recipeRaw.yield_cajas, factorDe(p.kg_caja)),
    }));
    const tienenReceta = new Set(((conReceta ?? []) as any[]).map((r) => r.product_id));
    candidatos = ((activos ?? []) as any[])
      .filter((p) => !tienenReceta.has(p.id))
      .map((p) => ({
        id: p.id, name: p.name, sku: p.sku, unit_label: p.unit_label,
        kg_caja: p.kg_caja !== null ? Number(p.kg_caja) : null,
      }));
  }

  const insumos = (insumosRaw ?? []) as { id: string; nombre: string; unidad: string; precio_unitario: number }[];

  // Ingredientes en query separada para que un fallo no afecte la carga de pasos
  let rawIngs: any[] = [];
  if (recipeRaw?.id) {
    const { data } = await adminClient
      .from("recipe_ingredients")
      .select("insumo_id, cantidad")
      .eq("recipe_id", recipeRaw.id);
    rawIngs = data ?? [];
  }

  const recipe = recipeRaw
    ? {
        yieldCajas:   recipeRaw.yield_cajas,
        vidaUtilDias: recipeRaw.vida_util_dias ?? 180,
        notes:        recipeRaw.notes ?? "",
        steps: ((recipeRaw.steps ?? []) as any[])
          .sort((a, b) => a.step_order - b.step_order)
          .map((s) => ({
            description: s.description,
            minutes:     Number(s.minutes),
            notes:       s.notes ?? "",
          })),
        ingredients: rawIngs
          .filter(ing => ing.insumo_id)
          .map((ing) => ({
            insumo_id: ing.insumo_id as string,
            cantidad:  Number(ing.cantidad),
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

      <RecetaEditor productId={productId} insumos={insumos} recipe={recipe} />

      {recipe && (
        <PresentacionesReceta
          baseId={productId}
          baseName={product.name}
          baseKgCaja={product.kg_caja !== null ? Number(product.kg_caja) : null}
          vinculadas={vinculadas}
          candidatos={candidatos}
        />
      )}
    </div>
  );
}
