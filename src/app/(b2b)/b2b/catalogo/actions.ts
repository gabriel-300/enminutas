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
    total_civa: number;
    por_unidad: number;
  };
  qty: number;
};

export async function confirmarPedidoB2B(items: CartItem[], notes: string | null = null, zonaId: string | null = null) {
  if (items.length === 0) throw new Error("Carrito vacío");

  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: perfil } = await (supabase as any)
    .from("profiles")
    .select("b2b_status")
    .eq("id", user.id)
    .single();
  if (!perfil || perfil.b2b_status !== "activo") throw new Error("Tu cuenta no está activa para realizar pedidos");

  const subtotal = items.reduce((s, i) => s + i.precio.total_civa * i.qty, 0);
  const r = (n: number) => Math.round(n * 100) / 100;

  const baseInsert = {
    channel:                  "b2b_mayorista",
    customer_id:              user.id,
    status:                   "pending_payment",
    subtotal:                 r(subtotal),
    shipping_fee:             0,
    discount:                 0,
    total:                    r(subtotal),
    ideaia_commission_rate:   0.15,
    ideaia_commission_amount: 0,
    shipping_method:          "b2b_despacho",
    payment_method:           "transferencia",
    notes:                    notes ?? null,
    delivery_zone_id:         zonaId ?? null,
  };

  // Insertar con retry en caso de colisión de número (constraint UNIQUE)
  const year = new Date().getFullYear();
  let order: { id: string } | null = null;
  let orderNum = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: maxRow } = await adminClient
      .from("orders")
      .select("order_number")
      .like("order_number", `B2B-${year}-%`)
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextSeq = 1;
    if ((maxRow as any)?.order_number) {
      const last = parseInt((maxRow as any).order_number.split("-").pop() ?? "0", 10);
      if (!isNaN(last)) nextSeq = last + 1;
    }
    orderNum = `B2B-${year}-${String(nextSeq).padStart(4, "0")}`;
    const { data: o, error: oErr } = await supabase
      .from("orders")
      .insert({ ...baseInsert, order_number: orderNum } as any)
      .select("id")
      .single();
    if (!oErr && o) { order = o; break; }
    if (oErr?.code !== "23505") throw new Error(oErr?.message ?? "Error al crear el pedido");
  }
  if (!order) throw new Error("No se pudo generar número de pedido único. Intenta de nuevo.");

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
