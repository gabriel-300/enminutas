"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export type DevolucionItemInput = {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
};

export async function crearDevolucion(payload: {
  clienteId: string;
  pedidoId?: string;
  fecha: string;
  motivo: string;
  observaciones?: string;
  items: DevolucionItemInput[];
}): Promise<{ id?: string; error?: string }> {
  try {
    const user = await getAdminUser();
    const db = createAdminClient() as any;

    const monto_total = payload.items.reduce(
      (s, i) => s + i.cantidad * i.precio_unitario,
      0
    );

    const { data: dev, error: devErr } = await db
      .from("devoluciones")
      .insert({
        cliente_id:    payload.clienteId,
        pedido_id:     payload.pedidoId || null,
        fecha:         payload.fecha,
        motivo:        payload.motivo.trim(),
        observaciones: payload.observaciones?.trim() || null,
        monto_total:   Math.round(monto_total * 100) / 100,
        created_by:    user.id,
      })
      .select("id")
      .single();

    if (devErr) return { error: devErr.message };

    for (const item of payload.items) {
      const subtotal = Math.round(item.cantidad * item.precio_unitario * 100) / 100;
      const { error: itemErr } = await db.from("devolucion_items").insert({
        devolucion_id:   dev.id,
        descripcion:     item.descripcion.trim(),
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal,
      });
      if (itemErr) return { error: itemErr.message };
    }

    revalidatePath("/admin/devoluciones");
    return { id: dev.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function aprobarDevolucion(id: string): Promise<{ error?: string }> {
  try {
    const user = await getAdminUser();
    const db = createAdminClient() as any;

    const { data: dev } = await db
      .from("devoluciones")
      .select("cliente_id, monto_total, estado, motivo")
      .eq("id", id)
      .single();

    if (!dev) return { error: "Devolución no encontrada" };
    if (dev.estado !== "solicitada") return { error: "Solo se pueden aprobar devoluciones solicitadas" };

    // Crear movimiento en cuenta corriente (crédito a favor del cliente)
    const { data: mov, error: movErr } = await db
      .from("cc_movimientos")
      .insert({
        cliente_id:  dev.cliente_id,
        tipo:        "nota_credito",
        monto:       -Math.abs(Number(dev.monto_total)),
        descripcion: `Nota de crédito — ${dev.motivo}`,
        referencia:  `DEV-${id.slice(0, 8).toUpperCase()}`,
        fecha:       new Date().toISOString().slice(0, 10),
        created_by:  user.id,
      })
      .select("id")
      .single();

    if (movErr) return { error: movErr.message };

    const { error } = await db
      .from("devoluciones")
      .update({ estado: "aprobada", cc_movimiento_id: mov.id })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin/devoluciones");
    revalidatePath(`/admin/devoluciones/${id}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function rechazarDevolucion(id: string): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    const { data: dev } = await db
      .from("devoluciones").select("estado").eq("id", id).single();
    if (!dev) return { error: "Devolución no encontrada" };
    if (dev.estado !== "solicitada") return { error: "Solo se pueden rechazar devoluciones solicitadas" };

    const { error } = await db
      .from("devoluciones").update({ estado: "rechazada" }).eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/devoluciones");
    revalidatePath(`/admin/devoluciones/${id}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function cerrarDevolucion(id: string): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    const { data: dev } = await db
      .from("devoluciones").select("estado").eq("id", id).single();
    if (!dev) return { error: "Devolución no encontrada" };
    if (dev.estado !== "aprobada") return { error: "Solo se pueden cerrar devoluciones aprobadas" };

    const { error } = await db
      .from("devoluciones").update({ estado: "cerrada" }).eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/devoluciones");
    revalidatePath(`/admin/devoluciones/${id}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
