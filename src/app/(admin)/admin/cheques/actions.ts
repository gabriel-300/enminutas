"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function registrarCheque(payload: {
  clienteId: string;
  numeroCheque: string;
  banco: string;
  librador?: string;
  monto: number;
  fechaEmision: string;
  fechaAcreditacion: string;
  observaciones?: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const user = await getAdminUser();
    const db = createAdminClient() as any;

    const { data, error } = await db.from("cheques").insert({
      cliente_id:         payload.clienteId,
      numero_cheque:      payload.numeroCheque.trim(),
      banco:              payload.banco.trim(),
      librador:           payload.librador?.trim() || null,
      monto:              payload.monto,
      fecha_emision:      payload.fechaEmision,
      fecha_acreditacion: payload.fechaAcreditacion,
      observaciones:      payload.observaciones?.trim() || null,
      created_by:         user.id,
    }).select("id").single();

    if (error) return { error: error.message };
    revalidatePath("/admin/cheques");
    return { id: data.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function depositarCheque(id: string): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    const { data: ch } = await db.from("cheques").select("estado").eq("id", id).single();
    if (!ch) return { error: "Cheque no encontrado" };
    if (ch.estado !== "en_cartera") return { error: "Solo se pueden depositar cheques en cartera" };

    const { error } = await db.from("cheques").update({ estado: "depositado" }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/cheques");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function acreditarCheque(id: string): Promise<{ error?: string }> {
  try {
    const user = await getAdminUser();
    const db = createAdminClient() as any;

    const { data: ch } = await db
      .from("cheques")
      .select("estado, cliente_id, monto, numero_cheque, banco")
      .eq("id", id).single();

    if (!ch) return { error: "Cheque no encontrado" };
    if (!["en_cartera", "depositado"].includes(ch.estado))
      return { error: "Solo se pueden acreditar cheques en cartera o depositados" };

    // Crear pago en cuenta corriente
    const { data: mov, error: movErr } = await db.from("cc_movimientos").insert({
      cliente_id:  ch.cliente_id,
      tipo:        "pago",
      monto:       -Math.abs(Number(ch.monto)),
      descripcion: `Cheque acreditado N° ${ch.numero_cheque} — ${ch.banco}`,
      referencia:  ch.numero_cheque,
      fecha:       new Date().toISOString().slice(0, 10),
      created_by:  user.id,
    }).select("id").single();

    if (movErr) return { error: movErr.message };

    const { error } = await db
      .from("cheques")
      .update({ estado: "acreditado", cc_movimiento_id: mov.id })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/cheques");
    revalidatePath(`/admin/cuentas-corrientes/${ch.cliente_id}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function rechazarCheque(id: string): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    const { data: ch } = await db.from("cheques").select("estado").eq("id", id).single();
    if (!ch) return { error: "Cheque no encontrado" };
    if (!["en_cartera", "depositado"].includes(ch.estado))
      return { error: "Solo se pueden rechazar cheques en cartera o depositados" };

    const { error } = await db.from("cheques").update({ estado: "rechazado" }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/cheques");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
