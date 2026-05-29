"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function guardarReceta(formData: FormData) {
  const productId  = formData.get("product_id") as string;
  const yieldCajas = parseInt(formData.get("yield_cajas") as string, 10) || 1;
  const notes      = (formData.get("notes") as string | null)?.trim() || null;

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

  if (!productId) throw new Error("Producto requerido");

  const db = createAdminClient() as any;

  // Upsert receta
  const { data: recipe, error: recipeError } = await db
    .from("recipes")
    .upsert({ product_id: productId, yield_cajas: yieldCajas, notes }, { onConflict: "product_id" })
    .select("id")
    .single();

  if (recipeError || !recipe) throw new Error(recipeError?.message ?? "Error al guardar receta");

  // Reemplazar pasos: borrar existentes e insertar nuevos
  await db.from("recipe_steps").delete().eq("recipe_id", recipe.id);

  if (steps.length > 0) {
    const rows = steps.map((s, idx) => ({
      recipe_id:   recipe.id,
      step_order:  idx + 1,
      description: s.description,
      minutes:     s.minutes,
      notes:       s.notes,
    }));
    const { error: stepsError } = await db.from("recipe_steps").insert(rows);
    if (stepsError) throw new Error(stepsError.message);
  }

  revalidatePath("/admin/cocina/recetas");
  revalidatePath(`/admin/cocina/recetas/${productId}`);
  revalidatePath("/admin/cocina");
}

export async function eliminarReceta(productId: string) {
  const db = createAdminClient() as any;
  await db.from("recipes").delete().eq("product_id", productId);
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/cocina");
}
