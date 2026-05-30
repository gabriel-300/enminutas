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

export type ReorderLine = {
  productId: string;
  sku:       string;
  name:      string;
  price:     number;
  quantity:  number;
  unitLabel: string;
  imageUrl:  string | null;
};

export async function getOrderLinesForReorder(orderId: string): Promise<ReorderLine[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .single();

  if (!order) throw new Error("Pedido no encontrado");

  const { data: lines } = await supabase
    .from("order_lines")
    .select("product_id, quantity, unit_price, product_snapshot")
    .eq("order_id", orderId);

  return ((lines ?? []) as any[]).map((line) => ({
    productId: line.product_id,
    sku:       line.product_snapshot?.sku        ?? "",
    name:      line.product_snapshot?.name       ?? "Producto",
    price:     Number(line.unit_price),
    quantity:  Number(line.quantity),
    unitLabel: line.product_snapshot?.unit_label ?? "",
    imageUrl:  null,
  }));
}
