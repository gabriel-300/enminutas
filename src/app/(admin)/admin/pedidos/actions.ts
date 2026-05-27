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
