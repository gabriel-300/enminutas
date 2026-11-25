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

    // Tarea 92: un producto con receta no se carga como lote suelto -- eso dejaba 27 lotes en
    // noviembre sin registro de producción, sin costo y sin descontar insumos. Para esos, el
    // alta es desde Producción (que ya descuenta insumos y, ahora, pone el costo de la receta).
    if (await tieneReceta(db, payload.productoId)) {
      return { error: "Este producto se fabrica con receta: cargá la producción en /admin/cocina/produccion, no un lote suelto." };
    }

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

// Un producto es "de receta propia" si es la base de una receta o una presentación de una:
// a esos no se les debería sumar stock a mano, hay que cargar producción (tarea 92).
async function tieneReceta(db: any, productoId: string): Promise<boolean> {
  const { data: producto } = await db.from("products").select("receta_producto_id").eq("id", productoId).maybeSingle();
  if (producto?.receta_producto_id) return true;
  const { data: receta } = await db.from("recipes").select("id").eq("product_id", productoId).maybeSingle();
  return !!receta;
}

export async function ajustarCantidad(
  id: string,
  nuevaCantidad: number,
  motivo: string
): Promise<{ error?: string }> {
  try {
    const user = await requireAdmin();
    const db = createAdminClient() as any;

    const motivoLimpio = motivo?.trim();
    if (!motivoLimpio) return { error: "El motivo es obligatorio" };

    const { data: lote } = await db.from("lotes").select("producto_id, cantidad_inicial, cantidad_actual").eq("id", id).single();
    if (!lote) return { error: "El lote no existe" };

    const cantidadAnterior = Number(lote.cantidad_actual);
    if (nuevaCantidad > cantidadAnterior && (await tieneReceta(db, lote.producto_id))) {
      return { error: "Este producto se fabrica con receta: para sumar stock cargá la producción en /admin/cocina/produccion, no un ajuste manual." };
    }

    // Si la nueva cantidad supera la inicial (entró más stock, no fue consumo),
    // subimos también la inicial para que el % consumido no quede negativo.
    const update: { cantidad_actual: number; cantidad_inicial?: number } = { cantidad_actual: nuevaCantidad };
    if (nuevaCantidad > Number(lote.cantidad_inicial)) update.cantidad_inicial = nuevaCantidad;

    const { error } = await db
      .from("lotes")
      .update(update)
      .eq("id", id);

    if (error) return { error: error.message };

    await db.from("ajustes_stock_lotes").insert({
      lote_id:           id,
      producto_id:       lote.producto_id,
      cantidad_anterior: cantidadAnterior,
      cantidad_nueva:    nuevaCantidad,
      motivo:            motivoLimpio,
      creado_por:        user.id,
    });

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
