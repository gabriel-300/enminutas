"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { emailNuevoPedidoB2B } from "@/lib/email";

type CartItem = {
  id:          string;
  name:        string;
  unit_label:  string | null;
  bolsas_caja: number | null;
  precio: {
    lista_siva: number;
    comision:   number;
    flete:      number;
    total_siva: number;
    total_civa: number;
  };
  qty: number;
};

export async function confirmarPedidoB2B(items: CartItem[]) {
  if (items.length === 0) throw new Error("Carrito vacío");

  const supabase      = await createClient();
  const adminClient   = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const subtotal         = items.reduce((s, i) => s + i.precio.total_civa  * i.qty, 0);
  const commissionAmount = items.reduce((s, i) => s + i.precio.comision    * i.qty, 0);

  const year = new Date().getFullYear();
  const { data: maxOrder } = await adminClient
    .from("orders")
    .select("order_number")
    .like("order_number", `B2B-${year}-%`)
    .order("order_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSeq = 1;
  if (maxOrder?.order_number) {
    const lastNum = parseInt(maxOrder.order_number.split("-").pop() ?? "0", 10);
    if (!isNaN(lastNum)) nextSeq = lastNum + 1;
  }

  const orderNum = `B2B-${year}-${String(nextSeq).padStart(4, "0")}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number:              orderNum,
      channel:                   "b2b_mayorista",
      customer_id:               user.id,
      status:                    "pending_payment",
      subtotal:                  Math.round(subtotal * 100) / 100,
      shipping_fee:              0,
      discount:                  0,
      total:                     Math.round(subtotal * 100) / 100,
      ideaia_commission_rate:    0.15,
      ideaia_commission_amount:  Math.round(commissionAmount * 100) / 100,
      shipping_method:           "b2b_despacho",
      payment_method:            "transferencia",
    })
    .select("id")
    .single();

  if (orderError || !order) throw new Error(orderError?.message ?? "Error al crear el pedido");

  const lines = items.map((item) => ({
    order_id:         order.id,
    product_id:       item.id,
    product_snapshot: {
      name:        item.name,
      unit_label:  item.unit_label,
      bolsas_caja: item.bolsas_caja,
      precio:      item.precio,
    },
    quantity:   item.qty,
    unit_price: Math.round(item.precio.total_civa * 100) / 100,
    line_total: Math.round(item.precio.total_civa * item.qty * 100) / 100,
  }));

  const { error: linesError } = await supabase.from("order_lines").insert(lines as any);

  if (linesError) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(linesError.message);
  }

  // Notificar al admin — fire and forget
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  emailNuevoPedidoB2B({
    orderNumber: orderNum,
    clientName:  (profile?.full_name as string | null) ?? user.email ?? "—",
    clientEmail: user.email ?? "",
    lines:       items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.precio.total_civa })),
    total:       Math.round(subtotal * 100) / 100,
  }).catch(() => {});

  redirect(`/b2b/pedidos/${order.id}`);
}
