"use server";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { parseMontoAR } from "@/lib/proveedores";
import { saldoPedidoDb } from "@/lib/cobranza";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true; pagoId: string; aviso?: string };

// Un pedido solo pasa a "liquidado" (cobrado) si ya se entregó. Si se paga por adelantado, el pago
// queda registrado pero el pedido sigue su curso: pasar a liquidado antes de entregarse lo saca del
// circuito de distribución (no se puede confirmar la entrega) y hacía que comisionara sin entregarse.
// Tampoco se liquida si todavía queda saldo por cobrar: la deuda desaparecería de las pantallas.
// Devuelve un aviso (para mostrar al usuario) cuando no se pudo liquidar por saldo.
async function liquidarSiEntregado(db: any, orderId: string): Promise<string | null> {
  const info = await saldoPedidoDb(db, orderId);
  if (info && info.saldo > 1) {
    return `El pedido no se liquidó: todavía queda un saldo de ${fmtPesos(info.saldo)}.`;
  }
  await db
    .from("orders")
    .update({ status: "liquidado", payment_confirmed_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", ["delivered", "entrega_parcial"]);
  return null;
}

const fmtPesos = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

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
  const monto          = parseMontoAR((formData.get("monto") as string) ?? "") ?? NaN;
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

  // Cambiar estado del pedido a liquidado si corresponde (solo si ya fue entregado y sin saldo)
  let aviso: string | undefined;
  if (orderId && marcarLiquidado) {
    aviso = (await liquidarSiEntregado(db, orderId)) ?? undefined;
    revalidatePath(`/admin/pedidos/${orderId}`);
  }

  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true, pagoId: pago.id, aviso };
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
}): Promise<{ error: string } | { ok: true; pagoIds: string[]; avisos: string[] }> {
  const { clienteId, fecha, metodo, referencia, notas, sinFactura, items } = payload;

  if (!clienteId) return { error: "Cliente requerido" };
  if (!fecha) return { error: "La fecha es requerida" };
  if (!items.length) return { error: "Seleccioná al menos un pedido" };
  if (items.some((it) => isNaN(it.monto) || it.monto <= 0))
    return { error: "El monto de cada pedido debe ser mayor a cero" };

  const auth = await autorizarCliente(clienteId);
  if ("error" in auth) return { error: auth.error };
  const { user } = auth;

  // Un cobro "sin factura" implica un descuento (se cobra neto de IVA): lo decide un administrador.
  if (sinFactura && user.app_metadata?.role !== "admin")
    return { error: "Solo un administrador puede registrar un cobro sin factura" };

  const db = createAdminClient() as any;
  const pagoIds: string[] = [];
  const avisos: string[] = [];
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
      const aviso = await liquidarSiEntregado(db, item.orderId);
      if (aviso) avisos.push(aviso);
      revalidatePath(`/admin/pedidos/${item.orderId}`);
    }
  }

  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true, pagoIds, avisos };
}

// Solo un administrador borra cobros. Si el pedido estaba liquidado y al borrar vuelve a quedar saldo,
// el pedido vuelve a "entregado" para que la deuda reaparezca.
export async function eliminarPago(pagoId: string, clienteId: string): Promise<{ error: string } | { ok: true }> {
  let user: User;
  try {
    user = await requireRole("admin");
  } catch {
    return { error: "Solo un administrador puede eliminar cobros" };
  }

  const db = createAdminClient() as any;
  const { data: pago } = await db.from("pagos").select("cliente_id, order_id, monto").eq("id", pagoId).single();
  if (!pago) return { error: "Pago no encontrado" };

  const { error } = await db.from("pagos").delete().eq("id", pagoId);
  if (error) return { error: error.message };

  if (pago.order_id) {
    const { data: order } = await db
      .from("orders").select("status, order_number, delivered_snapshot").eq("id", pago.order_id).single();
    if (order?.status === "liquidado") {
      const info = await saldoPedidoDb(db, pago.order_id);
      if (info && info.saldo > 1) {
        const vuelve = order.delivered_snapshot ? "entrega_parcial" : "delivered";
        await db.from("orders").update({ status: vuelve, payment_confirmed_at: null }).eq("id", pago.order_id);
        await db.from("order_events").insert({
          order_id: pago.order_id,
          status:   vuelve,
          message:  `Se eliminó un cobro de ${fmtPesos(Number(pago.monto))}: el pedido deja de estar liquidado (saldo ${fmtPesos(info.saldo)})`,
          actor_id: user.id,
        });
      }
    }
    revalidatePath(`/admin/pedidos/${pago.order_id}`);
  }

  revalidatePath(`/admin/clientes-b2b/${pago.cliente_id}`);
  revalidatePath("/admin/cuentas-corrientes");
  revalidatePath("/admin/pedidos");
  return { ok: true };
}
