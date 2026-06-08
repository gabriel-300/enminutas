"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailPagoConfirmado } from "@/lib/email";

async function getCallerRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (user.app_metadata?.role as string) ?? null;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const role = await getCallerRole();
  if (role !== "admin") throw new Error("No autorizado");

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
  revalidatePath("/admin/produccion");
}

export async function despacharPedido(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "produccion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: current } = await (supabase as any).from("orders").select("status, id").eq("id", orderId).single();
  if ((current as any)?.status !== "enviado_prod") throw new Error("El pedido debe estar en preparación para despacharse");

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

  const { data: current } = await (supabase as any).from("orders").select("status").eq("id", orderId).single();
  if ((current as any)?.status !== "despachado") throw new Error("El pedido debe estar despachado para iniciar distribución");

  const { error } = await (supabase as any)
    .from("orders")
    .update({ status: "en_distribucion" as any })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/produccion");
}

export async function confirmarEntrega(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "distribucion") throw new Error("No autorizado");

  const supabase = createAdminClient();

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
