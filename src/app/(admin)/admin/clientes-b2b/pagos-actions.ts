"use server";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true; pagoId: string };

// Admin: cualquier cliente. Vendedor: sólo los clientes que tiene asignados.
async function autorizarCliente(clienteId: string): Promise<{ error: string } | { user: User }> {
  let user: User;
  try {
    user = await requireRole("admin", "vendedor");
  } catch {
    return { error: "No autorizado" };
  }
  if (user.app_metadata?.role === "vendedor") {
    const { data } = await (createAdminClient() as any)
      .from("profiles").select("vendedor_id").eq("id", clienteId).single();
    if (!data || data.vendedor_id !== user.id) return { error: "No autorizado" };
  }
  return { user };
}

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

  const auth = await autorizarCliente(clienteId);
  if ("error" in auth) return { error: auth.error };
  const { user } = auth;

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

export type PagoPedidoItem = { orderId: string; monto: number; marcarLiquidado: boolean };

export async function registrarPagoPedidos(payload: {
  clienteId:  string;
  fecha:      string;
  metodo:     string;
  referencia: string | null;
  notas:      string | null;
  sinFactura: boolean;
  items:      PagoPedidoItem[];
}): Promise<{ error: string } | { ok: true; pagoIds: string[] }> {
  const { clienteId, fecha, metodo, referencia, notas, sinFactura, items } = payload;

  if (!clienteId) return { error: "Cliente requerido" };
  if (!fecha) return { error: "La fecha es requerida" };
  if (!items.length) return { error: "Seleccioná al menos un pedido" };
  if (items.some((it) => isNaN(it.monto) || it.monto <= 0))
    return { error: "El monto de cada pedido debe ser mayor a cero" };

  const auth = await autorizarCliente(clienteId);
  if ("error" in auth) return { error: auth.error };
  const { user } = auth;

  const db = createAdminClient() as any;
  const pagoIds: string[] = [];
  // Varios pedidos en la misma tanda comparten grupo_id → un solo recibo combinado.
  const grupoId = items.length > 1 ? crypto.randomUUID() : null;

  for (const item of items) {
    const { data: pago, error } = await db.from("pagos").insert({
      cliente_id:  clienteId,
      monto:       item.monto,
      fecha,
      metodo,
      referencia,
      notas,
      order_id:    item.orderId,
      sin_factura: sinFactura,
      grupo_id:    grupoId,
      created_by:  user.id,
    }).select("id").single();

    if (error) return { error: error.message };
    pagoIds.push(pago.id);

    if (item.marcarLiquidado) {
      await db.from("orders")
        .update({ status: "liquidado", payment_confirmed_at: new Date().toISOString() })
        .eq("id", item.orderId);
      revalidatePath(`/admin/pedidos/${item.orderId}`);
    }
  }

  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true, pagoIds };
}

export async function eliminarPago(pagoId: string, clienteId: string): Promise<{ error: string } | { ok: true }> {
  const db = createAdminClient() as any;
  // El cliente se toma del pago en la base, no del parámetro (que controla el llamador).
  const { data: pago } = await db.from("pagos").select("cliente_id").eq("id", pagoId).single();
  if (!pago) return { error: "Pago no encontrado" };
  const auth = await autorizarCliente(pago.cliente_id);
  if ("error" in auth) return { error: auth.error };

  const { error } = await db.from("pagos").delete().eq("id", pagoId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true };
}
