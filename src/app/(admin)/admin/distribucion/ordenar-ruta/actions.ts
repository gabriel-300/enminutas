"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function guardarOrdenRuta(
  items: { id: string; orden: number }[]
): Promise<{ error?: string }> {
  try {
    await requireRole("admin", "distribucion");
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
    await requireRole("admin", "distribucion");
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
