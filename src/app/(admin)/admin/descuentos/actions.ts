"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

export async function guardarTier(formData: FormData): Promise<Result> {
  const id           = formData.get("id") as string | null;
  const minCajas     = parseInt(formData.get("min_cajas") as string, 10);
  const descuentoPct = parseFloat(formData.get("descuento_pct") as string);
  const label        = (formData.get("label") as string).trim();

  if (!minCajas || !descuentoPct || !label) return { error: "Todos los campos son requeridos" };

  const db = createAdminClient() as any;

  if (id) {
    const { error } = await db.from("volume_discounts").update({ min_cajas: minCajas, descuento_pct: descuentoPct, label }).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await db.from("volume_discounts").insert({ min_cajas: minCajas, descuento_pct: descuentoPct, label });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/descuentos");
  revalidatePath("/admin/pedidos/nuevo");
  return { ok: true };
}

export async function eliminarTier(id: string): Promise<Result> {
  const db = createAdminClient() as any;
  const { error } = await db.from("volume_discounts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/descuentos");
  revalidatePath("/admin/pedidos/nuevo");
  return { ok: true };
}

export async function toggleTier(id: string, activo: boolean): Promise<Result> {
  const db = createAdminClient() as any;
  const { error } = await db.from("volume_discounts").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/descuentos");
  revalidatePath("/admin/pedidos/nuevo");
  return { ok: true };
}
