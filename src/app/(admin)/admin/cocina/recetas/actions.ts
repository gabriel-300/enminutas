"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { error: string } | { ok: true };

function revalidateAll() {
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/cocina/compras");
}

export async function guardarReceta(formData: FormData): Promise<ActionResult> {
  const productId  = formData.get("product_id") as string;
  const yieldCajas = parseFloat((formData.get("yield_cajas") as string)?.replace(",", ".")) || 1;
  const notes      = (formData.get("notes") as string | null)?.trim() || null;

  if (!productId) return { error: "Producto requerido" };

  // Pasos: steps[0][description], steps[0][minutes], steps[0][notes]
  const steps: { description: string; minutes: number; notes: string | null }[] = [];
  let i = 0;
  while (formData.get(`steps[${i}][description]`) !== null) {
    const desc = (formData.get(`steps[${i}][description]`) as string).trim();
    const mins = parseFloat(formData.get(`steps[${i}][minutes]`) as string) || 0;
    const note = (formData.get(`steps[${i}][notes]`) as string | null)?.trim() || null;
    if (desc) steps.push({ description: desc, minutes: mins, notes: note });
    i++;
  }

  // Ingredientes: ings[0][insumo_id], ings[0][cantidad]
  const ings: { insumo_id: string; cantidad: number }[] = [];
  let j = 0;
  while (formData.get(`ings[${j}][insumo_id]`) !== null) {
    const insumo_id = (formData.get(`ings[${j}][insumo_id]`) as string).trim();
    const cantidad  = parseFloat((formData.get(`ings[${j}][cantidad]`) as string)?.replace(",", ".")) || 0;
    if (insumo_id && cantidad > 0) ings.push({ insumo_id, cantidad });
    j++;
  }

  const db = createAdminClient() as any;

  // Obtener receta existente o crear nueva
  const { data: existing } = await db
    .from("recipes")
    .select("id")
    .eq("product_id", productId)
    .maybeSingle();

  let recipeId: string;

  if (existing?.id) {
    const { error } = await db.from("recipes").update({ yield_cajas: yieldCajas, notes }).eq("id", existing.id);
    if (error) return { error: `Error al actualizar receta: ${error.message}` };
    recipeId = existing.id;
  } else {
    const { data: inserted, error } = await db
      .from("recipes")
      .insert({ product_id: productId, yield_cajas: yieldCajas, notes })
      .select("id")
      .single();
    if (error || !inserted) return { error: `Error al crear receta: ${error?.message ?? "sin datos"}` };
    recipeId = inserted.id;
  }

  // Reemplazar pasos
  const { error: delStepsErr } = await db.from("recipe_steps").delete().eq("recipe_id", recipeId);
  if (delStepsErr) return { error: `Error al borrar pasos: ${delStepsErr.message}` };

  if (steps.length > 0) {
    const { error: stepsError } = await db.from("recipe_steps").insert(
      steps.map((s, idx) => ({
        recipe_id:   recipeId,
        step_order:  idx + 1,
        description: s.description,
        minutes:     s.minutes,
        notes:       s.notes,
      }))
    );
    if (stepsError) return { error: `Error al guardar pasos: ${stepsError.message}` };
  }

  // Reemplazar ingredientes (ahora con insumo_id)
  const { error: delIngsErr } = await db.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  if (delIngsErr) return { error: `Error al borrar ingredientes: ${delIngsErr.message}` };

  if (ings.length > 0) {
    const { error: ingsError } = await db.from("recipe_ingredients").insert(
      ings.map(ing => ({ recipe_id: recipeId, insumo_id: ing.insumo_id, cantidad: ing.cantidad }))
    );
    if (ingsError) return { error: `Error al guardar ingredientes: ${ingsError.message}` };
  }

  revalidateAll();
  revalidatePath(`/admin/cocina/recetas/${productId}`);
  return { ok: true };
}

export async function actualizarCostoProducto(
  productId: string,
  costoNuevoPorCaja: number,
  bolsasCaja: number,
): Promise<ActionResult> {
  if (costoNuevoPorCaja <= 0) return { error: "El costo debe ser mayor a cero" };
  const bolsas = bolsasCaja > 0 ? bolsasCaja : 1;
  const costoUnidad = costoNuevoPorCaja / bolsas;
  const db = createAdminClient() as any;
  const { error } = await db.from("products").update({ costo: costoUnidad }).eq("id", productId);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function eliminarReceta(productId: string): Promise<ActionResult> {
  const db = createAdminClient() as any;
  const { error } = await db.from("recipes").delete().eq("product_id", productId);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function sincronizarCostoProducto(productId: string): Promise<ActionResult> {
  const db = createAdminClient() as any;

  const { data: recipe } = await db
    .from("recipes")
    .select("id, yield_cajas, ingredients:recipe_ingredients(cantidad, insumo:insumos!insumo_id(precio_unitario))")
    .eq("product_id", productId)
    .maybeSingle();

  if (!recipe) return { error: "No hay receta cargada para este producto." };

  const costoLote = (recipe.ingredients ?? []).reduce((s: number, ing: any) => {
    const precio = Number(ing.insumo?.precio_unitario ?? 0);
    return s + Number(ing.cantidad) * precio;
  }, 0);

  const yieldCajas = Number(recipe.yield_cajas) || 1;
  const costoCaja  = costoLote / yieldCajas;

  const { data: product } = await db
    .from("products")
    .select("bolsas_caja")
    .eq("id", productId)
    .single();

  const bolsas = Number(product?.bolsas_caja ?? 1) || 1;
  const costoUnidad = costoCaja / bolsas;

  const { error } = await db.from("products").update({ costo: costoUnidad }).eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath("/admin/productos");
  revalidatePath("/admin/rentabilidad");
  revalidateAll();
  return { ok: true };
}
