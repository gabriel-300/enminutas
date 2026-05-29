"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarLote(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const qty       = parseInt(formData.get("qty") as string, 10);
  const notes     = (formData.get("notes") as string | null)?.trim() || null;

  if (!productId || !qty || qty <= 0) throw new Error("Datos inválidos");

  const authClient  = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");

  await adminClient.rpc("increment_stock", {
    p_product_id: productId,
    p_qty:        qty,
  });

  await adminClient.from("stock_movements").insert({
    product_id: productId,
    qty,
    type:       "produccion",
    notes,
    created_by: user.id,
  });

  revalidatePath("/admin/cocina");
  revalidatePath("/admin/productos");
}

export async function ajustarStock(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const qty       = parseInt(formData.get("qty") as string, 10);
  const notes     = (formData.get("notes") as string | null)?.trim() || null;
  const minimoRaw = formData.get("minimo") as string | null;
  const minimo    = minimoRaw !== null && minimoRaw !== "" ? parseInt(minimoRaw, 10) : undefined;

  if (!productId || isNaN(qty)) throw new Error("Datos inválidos");

  const authClient  = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const updates: Record<string, number> = { stock_cajas: Math.max(qty, 0) };
  if (minimo !== undefined && !isNaN(minimo)) updates.stock_minimo = Math.max(minimo, 0);

  await adminClient.from("products").update(updates).eq("id", productId);

  await adminClient.from("stock_movements").insert({
    product_id: productId,
    qty,
    type:       "ajuste",
    notes:      notes ?? "Ajuste manual de inventario",
    created_by: user.id,
  });

  revalidatePath("/admin/cocina");
  revalidatePath("/admin/productos");
}
