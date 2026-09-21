"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function guardarObjetivo(
  anio: number,
  mes: number,
  canal: string,
  montoMeta: number
): Promise<{ error?: string }> {
  try {
    const user = await requireAdmin();
    const db = createAdminClient() as any;

    // upsert por (anio, mes, canal)
    const { error } = await db.from("objetivos_ventas").upsert(
      { anio, mes, canal, monto_meta: montoMeta, created_by: user.id },
      { onConflict: "anio,mes,canal" }
    );

    if (error) return { error: error.message };
    revalidatePath("/admin/objetivos");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
