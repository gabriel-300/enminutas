"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailPagoConfirmado } from "@/lib/email";

async function logOrderEvent(
  db: ReturnType<typeof createAdminClient>,
  orderId: string,
  status: string,
  message: string,
  actorId?: string,
) {
  await (db as any).from("order_events").insert({
    order_id: orderId,
    status,
    message,
    actor_id: actorId ?? null,
  });
}

async function getCallerRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (user.app_metadata?.role as string) ?? null;
}

// Estados que admin puede setear manualmente (casos excepcionales)
const ALLOWED_MANUAL_STATUSES = ["pending_payment", "aprobado", "cancelled"] as const;

export async function updateOrderStatus(orderId: string, status: string) {
  const role = await getCallerRole();
  if (role !== "admin") throw new Error("No autorizado");

  if (!(ALLOWED_MANUAL_STATUSES as readonly string[]).includes(status))
    throw new Error(`Estado "${status}" no se puede asignar manualmente. Usá las acciones del workflow.`);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: status as any })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pedidos");
}

export async function aprobarPedidoB2B(orderId: string) {
  const supabase    = createAdminClient();
  const authClient  = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  if (user.app_metadata?.role !== "admin") throw new Error("No autorizado");

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({
      status:       "aprobado",
      aprobado_por: user.id,
      aprobado_at:  new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido ya fue procesado o no existe");
  await logOrderEvent(supabase, orderId, "aprobado", "Pedido aprobado", user.id);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/produccion");
}

export async function marcarEnviadoProd(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "produccion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  // Update con guard de estado para atomicidad — 0 filas = estado incorrecto
  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "enviado_prod" })
    .eq("id", orderId)
    .eq("status", "aprobado")
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido debe estar aprobado para iniciar preparación");
  await logOrderEvent(supabase, orderId, "enviado_prod", "Enviado a producción");
  revalidatePath("/admin/produccion");
}

export async function despacharPedido(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "produccion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: lines } = await (supabase as any)
    .from("order_lines")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  // Update con guard de estado para atomicidad
  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "despachado", despachado_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "enviado_prod")
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido debe estar en preparación para despacharse");
  await logOrderEvent(supabase, orderId, "despachado", "Pedido despachado");

  const stockInsuficiente: string[] = [];
  for (const line of (lines ?? []) as { product_id: string; quantity: number }[]) {
    const { data: suficiente } = await (supabase as any).rpc("decrement_stock", {
      p_product_id: line.product_id,
      p_qty:        line.quantity,
    });
    if (suficiente === false) stockInsuficiente.push(line.product_id);
    await (supabase as any).from("stock_movements").insert({
      product_id: line.product_id,
      qty:        -line.quantity,
      type:       "despacho",
      order_id:   orderId,
    });
  }
  // Stock insuficiente es advertencia, no bloquea el despacho (puede haber stock manual)
  // pero queda registrado en el log de la request si se necesita auditar

  revalidatePath("/admin/produccion");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/dashboard");
}

export async function confirmarPago(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin") throw new Error("No autorizado");

  const supabase = createAdminClient();
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("status, channel, order_number, total, guest_email, customer_id, customer:profiles!customer_id(full_name)")
    .eq("id", orderId)
    .single();

  const o = order as any;

  const authClient2 = await createClient();
  const { data: { user: adminUser } } = await authClient2.auth.getUser();

  const updates: Record<string, any> = {
    payment_confirmed_at: new Date().toISOString(),
  };
  if (o?.status === "pending_payment" && adminUser) {
    updates.status       = "aprobado";
    updates.aprobado_por = adminUser.id;
    updates.aprobado_at  = new Date().toISOString();
  }

  const { error } = await (supabase as any).from("orders").update(updates).eq("id", orderId);
  if (error) throw new Error(error.message);
  await logOrderEvent(supabase, orderId, updates.status ?? o?.status, "Pago confirmado", adminUser?.id);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/dashboard");

  if (o?.order_number) {
    let clientEmail: string | undefined = o.guest_email;
    let clientName: string = o.customer?.full_name ?? "Cliente";

    if (!clientEmail && o.customer_id) {
      const { data } = await (supabase as any).auth.admin.getUserById(o.customer_id);
      clientEmail = data?.user?.email;
    }

    if (clientEmail) {
      emailPagoConfirmado({
        orderNumber: o.order_number,
        clientEmail,
        clientName,
        isB2B: o.channel === "b2b_mayorista",
      }).catch(() => {});
    }
  }
}

export async function iniciarDistribucion(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "distribucion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "en_distribucion" })
    .eq("id", orderId)
    .eq("status", "despachado")
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido debe estar despachado para iniciar distribución");
  await logOrderEvent(supabase, orderId, "en_distribucion", "Distribución iniciada");

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/produccion");
}

export async function confirmarEntrega(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "distribucion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "delivered", entregado_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", ["despachado", "en_distribucion"])
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido no está en estado de distribución");
  await logOrderEvent(supabase, orderId, "delivered", "Entrega confirmada");

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
}

export async function agregarNota(orderId: string, nota: string) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "vendedor") throw new Error("No autorizado");

  const supabase = createAdminClient();

  if (role === "vendedor") {
    const { data: order } = await (supabase as any)
      .from("orders")
      .select("customer_id, customer:profiles!customer_id(vendedor_id)")
      .eq("id", orderId)
      .single();
    if (!order || (order as any).customer?.vendedor_id !== user.id) throw new Error("No autorizado");
  }

  const { error } = await supabase
    .from("orders")
    .update({ notes: nota.trim() || null })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/pedidos/${orderId}`);
}

export type LineaEntregada = {
  productId: string;
  name:      string;
  pedido:    number;
  entregado: number;
};

export async function confirmarEntregaParcial(orderId: string, lineas: LineaEntregada[]) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "distribucion") throw new Error("No autorizado");

  const todosEntregados = lineas.every((l) => l.entregado >= l.pedido);

  // Si todo fue entregado usar el flujo normal
  if (todosEntregados) {
    await confirmarEntrega(orderId);
    return;
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({
      status:             "entrega_parcial",
      entregado_at:       new Date().toISOString(),
      delivered_snapshot: { lineas, timestamp: new Date().toISOString() },
    })
    .eq("id", orderId)
    .in("status", ["despachado", "en_distribucion"])
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido no está en estado de distribución");
  await logOrderEvent(supabase, orderId, "entrega_parcial", "Entrega parcial confirmada");

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
}
