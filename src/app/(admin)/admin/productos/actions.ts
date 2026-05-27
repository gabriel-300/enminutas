"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleProductActive(productId: string, isActive: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}

export async function updateProductPrice(
  productId: string,
  priceB2c: number,
  priceB2b: number
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ price_b2c: priceB2c, price_b2b: priceB2b })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}

export async function crearProducto(formData: FormData) {
  const supabase = createAdminClient();

  const payload: Record<string, any> = {
    sku:               (formData.get("sku") as string).trim().toUpperCase(),
    name:              (formData.get("name") as string).trim(),
    unit_label:        (formData.get("unit_label") as string).trim(),
    price_b2c:         Number(formData.get("price_b2c")) || 0,
    price_b2b:         Number(formData.get("price_b2b")) || 0,
    is_active:         formData.get("is_active") === "on",
    short_description: (formData.get("short_description") as string)?.trim() || null,
    description:       (formData.get("description") as string)?.trim() || null,
    cooking_methods:   ((formData.get("cooking_methods") as string) ?? "")
                         .split("\n").map((s) => s.trim()).filter(Boolean),
  };

  const categoryId = formData.get("category_id") as string;
  if (categoryId) payload.category_id = categoryId;

  const coverImageUrl = formData.get("cover_image_url") as string;
  if (coverImageUrl) payload.cover_image_url = coverImageUrl;

  const extraImagesRaw = formData.get("extra_images") as string;
  try { payload.extra_images = JSON.parse(extraImagesRaw || "[]"); } catch { payload.extra_images = []; }

  const weightGrams = formData.get("weight_grams");
  if (weightGrams) payload.weight_grams = Number(weightGrams);

  // Campos B2B opcionales
  const costo = formData.get("costo");
  if (costo) {
    payload.costo        = Number(costo);
    payload.kg_caja      = Number(formData.get("kg_caja"))     || null;
    payload.bolsas_caja  = Number(formData.get("bolsas_caja")) || null;
    payload.pkg_unitario = Number(formData.get("pkg_unitario")) || 0;
    payload.pkg_bulto    = Number(formData.get("pkg_bulto"))    || 0;
    payload.margen_dist  = Number(formData.get("margen_dist"))  / 100 || 0.35;
    payload.margen_gastro = Number(formData.get("margen_gastro")) / 100 || 0.40;
    payload.margen_min   = Number(formData.get("margen_min"))   / 100 || 0.45;
    payload.mult_bolsas  = formData.get("mult_bolsas") === "on";
  }

  const { error } = await supabase.from("products").insert(payload as any);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  redirect("/admin/productos");
}

export async function actualizarProducto(productId: string, formData: FormData) {
  const supabase = createAdminClient();

  const payload: Record<string, any> = {
    sku:               (formData.get("sku") as string).trim().toUpperCase(),
    name:              (formData.get("name") as string).trim(),
    unit_label:        (formData.get("unit_label") as string).trim(),
    price_b2c:         Number(formData.get("price_b2c")) || 0,
    price_b2b:         Number(formData.get("price_b2b")) || 0,
    is_active:         formData.get("is_active") === "on",
    short_description: (formData.get("short_description") as string)?.trim() || null,
    description:       (formData.get("description") as string)?.trim() || null,
    cooking_methods:   ((formData.get("cooking_methods") as string) ?? "")
                         .split("\n").map((s) => s.trim()).filter(Boolean),
  };

  const categoryId = formData.get("category_id") as string;
  payload.category_id = categoryId || null;

  const coverImageUrl = formData.get("cover_image_url") as string;
  payload.cover_image_url = coverImageUrl || null;

  const extraImagesRaw = formData.get("extra_images") as string;
  try { payload.extra_images = JSON.parse(extraImagesRaw || "[]"); } catch { payload.extra_images = []; }

  const weightGrams = formData.get("weight_grams");
  payload.weight_grams = weightGrams ? Number(weightGrams) : null;

  // Campos B2B
  const costo = formData.get("costo");
  payload.costo        = costo ? Number(costo) : null;
  payload.kg_caja      = formData.get("kg_caja")      ? Number(formData.get("kg_caja"))      : null;
  payload.bolsas_caja  = formData.get("bolsas_caja")  ? Number(formData.get("bolsas_caja"))  : null;
  payload.pkg_unitario = Number(formData.get("pkg_unitario")) || 0;
  payload.pkg_bulto    = Number(formData.get("pkg_bulto"))    || 0;
  payload.margen_dist  = Number(formData.get("margen_dist"))  / 100 || 0.35;
  payload.margen_gastro = Number(formData.get("margen_gastro")) / 100 || 0.40;
  payload.margen_min   = Number(formData.get("margen_min"))   / 100 || 0.45;
  payload.mult_bolsas  = formData.get("mult_bolsas") === "on";

  const { error } = await supabase
    .from("products")
    .update(payload as any)
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  redirect("/admin/productos");
}

export async function eliminarProducto(productId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}
