"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { error: string } | { ok: true };

export async function guardarReceta(formData: FormData): Promise<ActionResult> {
  const productId  = formData.get("product_id") as string;
  const yieldCajas = parseInt(formData.get("yield_cajas") as string, 10) || 1;
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

  // Ingredientes: ings[0][nombre], ings[0][cantidad], ings[0][unidad]
  const ings: { nombre: string; cantidad: number; unidad: string }[] = [];
  let j = 0;
  while (formData.get(`ings[${j}][nombre]`) !== null) {
    const nombre   = (formData.get(`ings[${j}][nombre]`) as string).trim();
    const cantidad = parseFloat(formData.get(`ings[${j}][cantidad]`) as string) || 0;
    const unidad   = (formData.get(`ings[${j}][unidad]`) as string) || "u";
    if (nombre) ings.push({ nombre, cantidad, unidad });
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
    const { error: updErr } = await db
      .from("recipes")
      .update({ yield_cajas: yieldCajas, notes })
      .eq("id", existing.id);
    if (updErr) return { error: `Error al actualizar receta: ${updErr.message}` };
    recipeId = existing.id;
  } else {
    const { data: inserted, error: insErr } = await db
      .from("recipes")
      .insert({ product_id: productId, yield_cajas: yieldCajas, notes })
      .select("id")
      .single();
    if (insErr || !inserted) return { error: `Error al crear receta: ${insErr?.message ?? "sin datos"}` };
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

  // Reemplazar ingredientes
  const { error: delIngsErr } = await db.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  if (delIngsErr) return { error: `Error al borrar ingredientes: ${delIngsErr.message}` };

  if (ings.length > 0) {
    const { error: ingsError } = await db.from("recipe_ingredients").insert(
      ings.map((ing) => ({
        recipe_id: recipeId,
        nombre:    ing.nombre,
        cantidad:  ing.cantidad,
        unidad:    ing.unidad,
      }))
    );
    if (ingsError) return { error: `Error al guardar ingredientes: ${ingsError.message}` };
  }

  revalidatePath("/admin/cocina/recetas");
  revalidatePath(`/admin/cocina/recetas/${productId}`);
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/cocina/compras");

  return { ok: true };
}

export async function eliminarReceta(productId: string): Promise<ActionResult> {
  const db = createAdminClient() as any;
  const { error } = await db.from("recipes").delete().eq("product_id", productId);
  if (error) return { error: error.message };
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/cocina/compras");
  return { ok: true };
}
