"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function guardarObjetivo(
  anio: number,
  mes: number,
  canal: string,
  montoMeta: number
): Promise<{ error?: string }> {
  try {
    const user = await getAdminUser();
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
