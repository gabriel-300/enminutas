"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function actualizarStockMinimo(
  productoId: string,
  minimo: number | null
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !["admin", "produccion"].includes(user.app_metadata?.role))
      return { error: "No autorizado" };

    const db = createAdminClient() as any;
    const { error } = await db
      .from("products")
      .update({ stock_minimo: minimo })
      .eq("id", productoId);

    if (error) return { error: error.message };
    revalidatePath("/admin/stock");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
