"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  const { error } = await supabase
    .from("orders")
    .update({
      status:        "despachado" as any,
      despachado_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/dashboard");
}

export async function confirmarPago(orderId: string) {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status, channel")
    .eq("id", orderId)
    .single();

  const updates: Record<string, any> = {
    payment_confirmed_at: new Date().toISOString(),
  };
  // Si es B2B y aún está en pending_payment, avanzar a aprobado automáticamente
  if ((order as any)?.channel === "b2b_mayorista" && (order as any)?.status === "pending_payment") {
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
