"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function actualizarParametros(formData: FormData) {
  const user = await requireAdmin();
  const db = createAdminClient() as any;

  const iva_pct      = Number(formData.get("iva_pct")) / 100;
  const comision_pct = Number(formData.get("comision_pct")) / 100;

  if (isNaN(iva_pct) || iva_pct <= 0 || iva_pct > 1)
    throw new Error("IVA inválido");
  if (isNaN(comision_pct) || comision_pct < 0 || comision_pct > 1)
    throw new Error("Comisión inválida");

  const now = new Date().toISOString();

  const { error } = await db.from("parametros_globales").upsert([
    { clave: "iva_pct",      valor: iva_pct,      actualizado_at: now, actualizado_por: user.id },
    { clave: "comision_pct", valor: comision_pct,  actualizado_at: now, actualizado_por: user.id },
  ], { onConflict: "clave" });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/parametros");
  revalidatePath("/admin/reportes/precios");
}
