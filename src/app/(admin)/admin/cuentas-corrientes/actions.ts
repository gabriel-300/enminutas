"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function registrarMovimiento(payload: {
  clienteId: string;
  tipo: "cargo" | "pago" | "ajuste" | "nota_credito";
  monto: number;           // siempre positivo desde el form
  descripcion: string;
  referencia?: string;
  fecha: string;           // YYYY-MM-DD
  facturaId?: string;
}): Promise<{ error?: string }> {
  try {
    const user = await getAdminUser();
    const db = createAdminClient() as any;

    // pagos y notas de crédito se guardan con monto negativo
    const montoFinal =
      payload.tipo === "pago" || payload.tipo === "nota_credito"
        ? -Math.abs(payload.monto)
        : Math.abs(payload.monto);

    const { error } = await db.from("cc_movimientos").insert({
      cliente_id:  payload.clienteId,
      tipo:        payload.tipo,
      monto:       montoFinal,
      descripcion: payload.descripcion,
      referencia:  payload.referencia || null,
      fecha:       payload.fecha,
      factura_id:  payload.facturaId || null,
      created_by:  user.id,
    });

    if (error) return { error: error.message };

    revalidatePath("/admin/cuentas-corrientes");
    revalidatePath(`/admin/cuentas-corrientes/${payload.clienteId}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function actualizarLimiteCredito(
  clienteId: string,
  limite: number
): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    const { error } = await db
      .from("b2b_accounts")
      .update({ credit_limit: limite })
      .eq("profile_id", clienteId);

    if (error) return { error: error.message };

    revalidatePath("/admin/cuentas-corrientes");
    revalidatePath(`/admin/cuentas-corrientes/${clienteId}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function eliminarMovimiento(id: string): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;

    // primero obtenemos el cliente_id para revalidar
    const { data: mov } = await db
      .from("cc_movimientos").select("cliente_id").eq("id", id).single();

    const { error } = await db.from("cc_movimientos").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/cuentas-corrientes");
    if (mov) revalidatePath(`/admin/cuentas-corrientes/${mov.cliente_id}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
