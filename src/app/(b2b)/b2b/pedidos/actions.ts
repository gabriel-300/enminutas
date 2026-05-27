"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function declararPago(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("orders")
    .update({ payment_declared_at: new Date().toISOString() } as any)
    .eq("id", orderId)
    .eq("customer_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/b2b/pedidos/${orderId}`);
}
