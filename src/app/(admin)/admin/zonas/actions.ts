"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearZona(formData: FormData) {
  const name    = (formData.get("name") as string).trim();
  const flete   = Number(formData.get("flete_kg")) || null;
  if (!name) throw new Error("El nombre es requerido");

  const supabase = createAdminClient();
  const db = supabase as any;
  const { error } = await db.from("delivery_zones").insert({
    name,
    flete_kg: flete,
    polygon: { type: "Point", coordinates: [] },
    base_fee: 0,
    estimated_minutes: 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zonas");
}

export async function actualizarZona(id: string, formData: FormData) {
  const name  = (formData.get("name") as string).trim();
  const flete = Number(formData.get("flete_kg")) || null;
  if (!name) throw new Error("El nombre es requerido");

  const supabase = createAdminClient();
  const db = supabase as any;
  const { error } = await db.from("delivery_zones").update({ name, flete_kg: flete }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zonas");
}

export async function eliminarZona(id: string) {
  const supabase = createAdminClient();
  const db = supabase as any;
  const { error } = await db.from("delivery_zones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zonas");
}
