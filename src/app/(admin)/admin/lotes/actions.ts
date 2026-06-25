"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function crearLote(payload: {
  productoId: string;
  numeroLote: string;
  fechaIngreso: string;
  fechaVencimiento: string;
  cantidadInicial: number;
  unidad: string;
  proveedor?: string;
  costoUnitario?: number;
  observaciones?: string;
  depositoId?: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const user = await getAdminUser();
    const db = createAdminClient() as any;

    const { data, error } = await db.from("lotes").insert({
      producto_id:       payload.productoId,
      numero_lote:       payload.numeroLote.trim(),
      fecha_ingreso:     payload.fechaIngreso,
      fecha_vencimiento: payload.fechaVencimiento,
      cantidad_inicial:  payload.cantidadInicial,
      cantidad_actual:   payload.cantidadInicial,
      unidad:            payload.unidad,
      proveedor:         payload.proveedor?.trim() || null,
      costo_unitario:    payload.costoUnitario || null,
      observaciones:     payload.observaciones?.trim() || null,
      deposito_id:       payload.depositoId || null,
      created_by:        user.id,
    }).select("id").single();

    if (error) return { error: error.message };
    revalidatePath("/admin/lotes");
    return { id: data.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function ajustarCantidad(
  id: string,
  nuevaCantidad: number
): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    const { error } = await db
      .from("lotes")
      .update({ cantidad_actual: nuevaCantidad })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/lotes");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function darDeBajaLote(id: string): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    const { error } = await db
      .from("lotes")
      .update({ activo: false, cantidad_actual: 0 })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/lotes");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
