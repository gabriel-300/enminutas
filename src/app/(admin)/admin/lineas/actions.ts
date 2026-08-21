"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
}

export async function crearLinea(nombre: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { data: last } = await db.from("lineas_producto").select("orden").order("orden", { ascending: false }).limit(1).single();
    const orden = (last?.orden ?? 0) + 1;
    const { error } = await db.from("lineas_producto").insert({ nombre: nombre.trim(), orden });
    if (error) {
      if (error.code === "23505") return { error: `La línea "${nombre.trim()}" ya existe.` };
      return { error: error.message };
    }
    revalidatePath("/admin/lineas");
    revalidatePath("/admin/productos");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function eliminarLinea(id: number): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("linea_id", id);
    if ((count ?? 0) > 0) return { error: `No se puede eliminar: hay ${count} producto(s) con esta línea.` };
    const { error } = await db.from("lineas_producto").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/lineas");
    revalidatePath("/admin/productos");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
