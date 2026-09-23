"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { generarNumeroLote } from "@/lib/lotes";
import { revalidatePath } from "next/cache";

export async function crearLote(payload: {
  productoId: string;
  numeroLote?: string;
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
    const user = await requireAdmin();
    const db = createAdminClient() as any;

    const numeroLote = payload.numeroLote?.trim() || (await generarNumeroLote(db));

    const { data, error } = await db.from("lotes").insert({
      producto_id:       payload.productoId,
      numero_lote:       numeroLote,
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

    if (error) {
      if (error.code === "23505" || error.message?.includes("idx_lotes_numero_unico"))
        return { error: `El lote "${numeroLote}" ya existe para este producto. Usá otro número de lote.` };
      return { error: error.message };
    }
    revalidatePath("/admin/lotes");
    revalidatePath("/admin/stock");
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
    await requireAdmin();
    const db = createAdminClient() as any;

    const { data: lote } = await db.from("lotes").select("cantidad_inicial").eq("id", id).single();

    // Si la nueva cantidad supera la inicial (entró más stock, no fue consumo),
    // subimos también la inicial para que el % consumido no quede negativo.
    const update: { cantidad_actual: number; cantidad_inicial?: number } = { cantidad_actual: nuevaCantidad };
    if (lote && nuevaCantidad > Number(lote.cantidad_inicial)) update.cantidad_inicial = nuevaCantidad;

    const { error } = await db
      .from("lotes")
      .update(update)
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/lotes");
    revalidatePath("/admin/stock");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function darDeBajaLote(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;

    const { error } = await db
      .from("lotes")
      .update({ activo: false, cantidad_actual: 0 })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/lotes");
    revalidatePath("/admin/stock");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
