"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailPagoDeclarado } from "@/lib/email";

export async function declararPago(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, total, customer:profiles!customer_id(full_name)")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .single();

  const { error } = await supabase
    .from("orders")
    .update({ payment_declared_at: new Date().toISOString() } as any)
    .eq("id", orderId)
    .eq("customer_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/b2b/pedidos/${orderId}`);

  if (order) {
    emailPagoDeclarado({
      orderId,
      orderNumber: (order as any).order_number,
      clientName:  (order as any).customer?.full_name ?? user.email ?? "Cliente",
      clientEmail: user.email ?? "",
      total:       Number((order as any).total),
    }).catch(() => {});
  }
}
