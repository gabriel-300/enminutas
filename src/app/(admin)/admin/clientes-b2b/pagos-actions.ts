"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true; pagoId: string };

export async function registrarPago(formData: FormData): Promise<Result> {
  const clienteId      = (formData.get("cliente_id") as string)?.trim();
  const montoStr       = (formData.get("monto") as string)?.replace(",", ".").replace(/\s/g, "");
  const monto          = parseFloat(montoStr);
  const fecha          = (formData.get("fecha") as string)?.trim();
  const metodo         = (formData.get("metodo") as string)?.trim() || "transferencia";
  const referencia     = (formData.get("referencia") as string)?.trim() || null;
  const notas          = (formData.get("notas") as string)?.trim() || null;
  const orderId        = (formData.get("order_id") as string)?.trim() || null;
  const facturaNumero  = (formData.get("factura_numero") as string)?.trim() || null;
  const marcarLiquidado = formData.get("marcar_liquidado") === "1";

  if (!clienteId) return { error: "Cliente requerido" };
  if (isNaN(monto) || monto <= 0) return { error: "El monto debe ser mayor a cero" };
  if (!fecha) return { error: "La fecha es requerida" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const db = createAdminClient() as any;

  const { data: pago, error } = await db.from("pagos").insert({
    cliente_id:     clienteId,
    monto,
    fecha,
    metodo,
    referencia,
    notas,
    order_id:       orderId || null,
    factura_numero: facturaNumero || null,
    created_by:     user.id,
  }).select("id").single();

  if (error) return { error: error.message };

  // Cambiar estado del pedido a liquidado si corresponde
  if (orderId && marcarLiquidado) {
    await db.from("orders")
      .update({ status: "liquidado", payment_confirmed_at: new Date().toISOString() })
      .eq("id", orderId);
    revalidatePath(`/admin/pedidos/${orderId}`);
  }

  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true, pagoId: pago.id };
}

export async function eliminarPago(pagoId: string, clienteId: string): Promise<{ error: string } | { ok: true }> {
  const db = createAdminClient() as any;
  const { error } = await db.from("pagos").delete().eq("id", pagoId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true };
}
