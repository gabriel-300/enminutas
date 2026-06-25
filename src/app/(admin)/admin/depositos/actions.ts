"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function crearDeposito(payload: {
  nombre: string;
  descripcion?: string;
  direccion?: string;
}): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { error } = await db.from("depositos").insert({
      nombre:      payload.nombre.trim(),
      descripcion: payload.descripcion?.trim() || null,
      direccion:   payload.direccion?.trim()   || null,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin/depositos");
    revalidatePath("/admin/lotes");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function editarDeposito(
  id: string,
  payload: { nombre: string; descripcion?: string; direccion?: string }
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { error } = await db.from("depositos").update({
      nombre:      payload.nombre.trim(),
      descripcion: payload.descripcion?.trim() || null,
      direccion:   payload.direccion?.trim()   || null,
    }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/depositos");
    revalidatePath("/admin/lotes");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function toggleDeposito(id: string, activo: boolean): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { error } = await db.from("depositos").update({ activo }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/depositos");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
