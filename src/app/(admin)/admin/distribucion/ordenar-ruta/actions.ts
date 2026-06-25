"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role;
  if (!["admin", "distribucion"].includes(role)) throw new Error("No autorizado");
  return user;
}

export async function guardarOrdenRuta(
  items: { id: string; orden: number }[]
): Promise<{ error?: string }> {
  try {
    await getStaff();
    const db = createAdminClient() as any;

    // Actualizar en paralelo por lotes
    await Promise.all(
      items.map(({ id, orden }) =>
        db.from("orders").update({ orden_ruta: orden }).eq("id", id)
      )
    );

    revalidatePath("/admin/distribucion");
    revalidatePath("/admin/distribucion/ordenar-ruta");
    revalidatePath("/admin/distribucion/hoja-de-ruta");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function limpiarOrdenRuta(ids: string[]): Promise<{ error?: string }> {
  try {
    await getStaff();
    const db = createAdminClient() as any;
    const { error } = await db
      .from("orders")
      .update({ orden_ruta: null })
      .in("id", ids);
    if (error) return { error: error.message };
    revalidatePath("/admin/distribucion");
    revalidatePath("/admin/distribucion/ordenar-ruta");
    revalidatePath("/admin/distribucion/hoja-de-ruta");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
