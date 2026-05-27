"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function crearCategoria(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("El nombre es requerido");

  const supabase = createAdminClient();
  const { error } = await supabase.from("categories").insert({ name, slug: toSlug(name) } as any);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function actualizarCategoria(id: string, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("El nombre es requerido");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function eliminarCategoria(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}
