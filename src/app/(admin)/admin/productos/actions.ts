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

export async function updateProductPrice(productId: string, priceB2c: number, priceB2b: number) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ price_b2c: priceB2c, price_b2b: priceB2b })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}

function parseB2vPayload(formData: FormData): Record<string, any> {
  const num = (key: string) => {
    const v = formData.get(key);
    return v !== null && v !== "" ? Number(v) : null;
  };

  return {
    sku:               (formData.get("sku") as string).trim().toUpperCase(),
    name:              (formData.get("name") as string).trim(),
    unit_label:        (formData.get("unit_label") as string).trim(),
    price_b2c:         Number(formData.get("price_b2c")) || 0,
    price_b2b:         0,
    is_active:         formData.get("is_active") === "on",
    short_description: (formData.get("short_description") as string)?.trim() || null,
    description:       (formData.get("description") as string)?.trim() || null,
    cooking_methods:   ((formData.get("cooking_methods") as string) ?? "")
                         .split("\n").map((s) => s.trim()).filter(Boolean),
    weight_grams: num("weight_grams"),
    // B2B v5
    codigo:             num("codigo"),
    linea_id:           num("linea_id"),
    categoria:          (formData.get("categoria") as string) || "Estándar",
    presentacion:       (formData.get("presentacion") as string)?.trim() || null,
    costo:              num("costo"),
    bolsas_caja:        num("bolsas_caja"),
    u_bolsa:            num("u_bolsa"),
    kg_caja:            num("kg_caja"),
    pkg_unitario:       num("pkg_unitario"),
    pkg_bulto:          num("pkg_bulto"),
    divisiones_display: num("divisiones_display"),
    min_quantity_b2b:   num("min_quantity_b2b") ?? 1,
  };
}

export async function crearProducto(formData: FormData) {
  const supabase = createAdminClient();

  const payload = parseB2vPayload(formData);

  const categoryId = formData.get("category_id") as string;
  if (categoryId) payload.category_id = categoryId;

  const coverImageUrl = formData.get("cover_image_url") as string;
  if (coverImageUrl) payload.cover_image_url = coverImageUrl;

  const extraImagesRaw = formData.get("extra_images") as string;
  try { payload.extra_images = JSON.parse(extraImagesRaw || "[]"); } catch { payload.extra_images = []; }

  const slug = payload.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  payload.slug = slug;

  const { error } = await (supabase as any).from("products").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  redirect("/admin/productos");
}

export async function actualizarProducto(productId: string, formData: FormData) {
  const supabase = createAdminClient();

  const payload = parseB2vPayload(formData);

  payload.category_id     = (formData.get("category_id") as string) || null;
  payload.cover_image_url = (formData.get("cover_image_url") as string) || null;

  const extraImagesRaw = formData.get("extra_images") as string;
  try { payload.extra_images = JSON.parse(extraImagesRaw || "[]"); } catch { payload.extra_images = []; }

  const { error } = await (supabase as any)
    .from("products")
    .update(payload)
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  redirect("/admin/productos");
}

export async function eliminarProducto(productId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}
