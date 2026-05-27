"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { PrecioB2B } from "@/lib/b2b-pricing";

type ItemPedido = {
  productId:  string;
  name:       string;
  unitLabel:  string | null;
  bolsasCaja: number | null;
  precio:     PrecioB2B;
  quantity:   number;
};

type CrearPedidoPayload = {
  clientId:      string;
  canal:         string;
  zonaId:        string | null;
  items:         ItemPedido[];
  notes:         string;
  paymentMethod: string;
  initialStatus: string;
};

export async function crearPedidoAdmin(payload: CrearPedidoPayload) {
  const { clientId, canal, zonaId, items, notes, paymentMethod, initialStatus } = payload;

  if (!clientId)        throw new Error("Seleccioná un cliente");
  if (items.length === 0) throw new Error("Agregá al menos un producto");

  const authClient   = await createClient();
  const adminClient  = createAdminClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");

  // Número de pedido
  const { count } = await adminClient
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("channel", "b2b_mayorista");

  const seq      = String((count ?? 0) + 1).padStart(4, "0");
  const orderNum = `B2B-${new Date().getFullYear()}-${seq}`;

  // Totales
  const subtotal         = items.reduce((s, i) => s + i.precio.total_civa * i.quantity, 0);
  const commissionAmount = items.reduce((s, i) => s + i.precio.comision   * i.quantity, 0);

  const r = (n: number) => Math.round(n * 100) / 100;

  const orderInsert: Record<string, any> = {
    order_number:             orderNum,
    channel:                  "b2b_mayorista",
    customer_id:              clientId,
    status:                   initialStatus,
    subtotal:                 r(subtotal),
    shipping_fee:             0,
    discount:                 0,
    total:                    r(subtotal),
    ideaia_commission_rate:   0.15,
    ideaia_commission_amount: r(commissionAmount),
    shipping_method:          "b2b_despacho",
    payment_method:           paymentMethod,
    notes:                    notes || null,
    delivery_zone_id:         zonaId ?? null,
  };

  // Si se crea como aprobado, registrar quién y cuándo
  if (initialStatus === "aprobado") {
    orderInsert.aprobado_por = user.id;
    orderInsert.aprobado_at  = new Date().toISOString();
  }

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .insert(orderInsert as any)
    .select("id")
    .single();

  if (orderError || !order) throw new Error(orderError?.message ?? "Error al crear el pedido");

  const lines = items.map((item) => ({
    order_id:         order.id,
    product_id:       item.productId,
    product_snapshot: {
      name:        item.name,
      unit_label:  item.unitLabel,
      bolsas_caja: item.bolsasCaja,
      canal,
      precio:      item.precio,
    },
    quantity:   item.quantity,
    unit_price: r(item.precio.total_civa),
    line_total: r(item.precio.total_civa * item.quantity),
  }));

  const { error: linesError } = await adminClient.from("order_lines").insert(lines as any);

  if (linesError) {
    await adminClient.from("orders").delete().eq("id", order.id);
    throw new Error(linesError.message);
  }

  redirect(`/admin/pedidos/${order.id}`);
}
