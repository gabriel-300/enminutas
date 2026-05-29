"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailPagoConfirmado } from "@/lib/email";

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: status as any })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pedidos");
}

export async function aprobarPedidoB2B(orderId: string) {
  const supabase = createAdminClient();
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("orders")
    .update({
      status:       "aprobado" as any,
      aprobado_por: user.id,
      aprobado_at:  new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/produccion");
}

export async function marcarEnviadoProd(orderId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "enviado_prod" as any })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/produccion");
}

export async function despacharPedido(orderId: string) {
  const supabase = createAdminClient();

  // Obtener líneas del pedido para descontar stock
  const { data: lines } = await (supabase as any)
    .from("order_lines")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  const { error } = await supabase
    .from("orders")
    .update({
      status:        "despachado" as any,
      despachado_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  // Descontar stock y registrar movimiento por cada línea
  for (const line of (lines ?? []) as { product_id: string; quantity: number }[]) {
    await (supabase as any).rpc("decrement_stock", {
      p_product_id: line.product_id,
      p_qty:        line.quantity,
    });
    await (supabase as any).from("stock_movements").insert({
      product_id: line.product_id,
      qty:        -line.quantity,
      type:       "despacho",
      order_id:   orderId,
    });
  }

  revalidatePath("/admin/produccion");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/dashboard");
}

export async function confirmarPago(orderId: string) {
  const supabase = createAdminClient();
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("status, channel, order_number, total, guest_email, customer_id, customer:profiles!customer_id(full_name)")
    .eq("id", orderId)
    .single();

  const o = order as any;

  const updates: Record<string, any> = {
    payment_confirmed_at: new Date().toISOString(),
  };
  // Si es B2B y aún está en pending_payment, avanzar a aprobado automáticamente
  if (o?.channel === "b2b_mayorista" && o?.status === "pending_payment") {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      updates.status       = "aprobado";
      updates.aprobado_por = user.id;
      updates.aprobado_at  = new Date().toISOString();
    }
  }

  const { error } = await (supabase as any).from("orders").update(updates).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/dashboard");

  // Notificar al cliente — fire and forget
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

export async function confirmarEntrega(orderId: string) {
  const supabase = createAdminClient();

  // Intentar con entregado_at; si la columna no existe aún, reintentar sin ella
  let { error } = await (supabase as any)
    .from("orders")
    .update({ status: "delivered", entregado_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error?.message?.includes("entregado_at")) {
    ({ error } = await (supabase as any)
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId));
  }

  if (error) throw new Error(error.message);

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
}

export async function agregarNota(orderId: string, nota: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ notes: nota.trim() || null })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/pedidos/${orderId}`);
}
