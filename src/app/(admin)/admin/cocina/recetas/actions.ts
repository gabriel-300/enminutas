"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { error: string } | { ok: true };

export async function guardarReceta(formData: FormData): Promise<ActionResult> {
  const productId  = formData.get("product_id") as string;
  const yieldCajas = parseInt(formData.get("yield_cajas") as string, 10) || 1;
  const notes      = (formData.get("notes") as string | null)?.trim() || null;

  if (!productId) return { error: "Producto requerido" };

  // Pasos: vienen como steps[0][description], steps[0][minutes], etc.
  const steps: { description: string; minutes: number; notes: string | null }[] = [];
  let i = 0;
  while (formData.get(`steps[${i}][description]`) !== null) {
    const desc = (formData.get(`steps[${i}][description]`) as string).trim();
    const mins = parseFloat(formData.get(`steps[${i}][minutes]`) as string) || 0;
    const note = (formData.get(`steps[${i}][notes]`) as string | null)?.trim() || null;
    if (desc) steps.push({ description: desc, minutes: mins, notes: note });
    i++;
  }

  const db = createAdminClient() as any;

  // Upsert receta — buscar primero para obtener el id existente
  const { data: existing } = await db
    .from("recipes")
    .select("id")
    .eq("product_id", productId)
    .maybeSingle();

  let recipeId: string;

  if (existing?.id) {
    // UPDATE
    const { error: updErr } = await db
      .from("recipes")
      .update({ yield_cajas: yieldCajas, notes })
      .eq("id", existing.id);
    if (updErr) return { error: `Error al actualizar receta: ${updErr.message}` };
    recipeId = existing.id;
  } else {
    // INSERT
    const { data: inserted, error: insErr } = await db
      .from("recipes")
      .insert({ product_id: productId, yield_cajas: yieldCajas, notes })
      .select("id")
      .single();
    if (insErr || !inserted) return { error: `Error al crear receta: ${insErr?.message ?? "sin datos"}` };
    recipeId = inserted.id;
  }

  // Reemplazar pasos
  const { error: delErr } = await db.from("recipe_steps").delete().eq("recipe_id", recipeId);
  if (delErr) return { error: `Error al borrar pasos anteriores: ${delErr.message}` };

  if (steps.length > 0) {
    const rows = steps.map((s, idx) => ({
      recipe_id:   recipeId,
      step_order:  idx + 1,
      description: s.description,
      minutes:     s.minutes,
      notes:       s.notes,
    }));
    const { error: stepsError } = await db.from("recipe_steps").insert(rows);
    if (stepsError) return { error: `Error al guardar pasos: ${stepsError.message}` };
  }

  revalidatePath("/admin/cocina/recetas");
  revalidatePath(`/admin/cocina/recetas/${productId}`);
  revalidatePath("/admin/cocina");

  return { ok: true };
}

export async function eliminarReceta(productId: string): Promise<ActionResult> {
  const db = createAdminClient() as any;
  const { error } = await db.from("recipes").delete().eq("product_id", productId);
  if (error) return { error: error.message };
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/cocina");
  return { ok: true };
}
