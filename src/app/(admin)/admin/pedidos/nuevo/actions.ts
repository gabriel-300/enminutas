"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { PrecioB2B } from "@/lib/b2b-pricing";
import { emailPedidoAdminCreado } from "@/lib/email";

type ItemPedido = {
  productId:  string;
  name:       string;
  unitLabel:  string | null;
  bolsasCaja: number | null;
  precio:     PrecioB2B;
  quantity:   number;
};

type CrearPedidoPayload = {
  clientId:       string;
  canal:          string;
  zonaId:         string | null;
  items:          ItemPedido[];
  notes:          string;
  paymentMethod:  string;
  initialStatus:  string;
  discountPct?:   number;
  discountAmount?: number;
  shippingAddress?: { calle: string | null; numero: string | null; piso: string | null; ciudad: string | null } | null;
};

export async function crearPedidoAdmin(payload: CrearPedidoPayload): Promise<{ orderId: string } | { error: string }> {
  const { clientId, canal, zonaId, items, notes, paymentMethod, initialStatus, discountPct = 0, discountAmount = 0, shippingAddress } = payload;

  if (!clientId)        return { error: "Seleccioná un cliente" };
  if (items.length === 0) return { error: "Agregá al menos un producto" };

  // Validar cantidades mínimas B2B
  const adminClientEarly = createAdminClient();
  const productIds = items.map((i) => i.productId);
  const { data: minimos } = await (adminClientEarly as any)
    .from("products")
    .select("id, name, min_quantity_b2b")
    .in("id", productIds);
  for (const item of items) {
    const prod = (minimos ?? []).find((p: any) => p.id === item.productId);
    const min  = prod?.min_quantity_b2b ?? 1;
    if (item.quantity < min) return { error: `"${item.name}" requiere mínimo ${min} caja${min !== 1 ? "s" : ""} (cargaste ${item.quantity})` };
  }

  const authClient   = await createClient();
  const adminClient  = createAdminClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const callerRole = user.app_metadata?.role as string | undefined;

  // Vendedor solo puede crear pedidos para sus clientes asignados
  if (callerRole === "vendedor") {
    const { data: perfil } = await (adminClient as any)
      .from("profiles")
      .select("vendedor_id")
      .eq("id", clientId)
      .single();
    if (!perfil || perfil.vendedor_id !== user.id) return { error: "No autorizado: el cliente no te pertenece" };
  }

  // Totales
  const subtotalBruto    = items.reduce((s, i) => s + i.precio.final_civa * i.quantity, 0);
  const subtotal         = subtotalBruto;
  const safePct          = Math.max(0, Math.min(100, discountPct ?? 0));
  const rawDescuento     = discountAmount > 0 ? discountAmount : Math.round(subtotalBruto * safePct / 100 * 100) / 100;
  const descuento        = Math.max(0, Math.min(subtotalBruto, rawDescuento));
  const total            = subtotalBruto - descuento;

  const r = (n: number) => Math.round(n * 100) / 100;

  const shippingSnapshot = (shippingAddress?.calle || shippingAddress?.ciudad)
    ? {
        street: shippingAddress.calle  ?? null,
        number: shippingAddress.numero ?? null,
        floor:  shippingAddress.piso   ?? null,
        city:   shippingAddress.ciudad ?? null,
      }
    : null;

  const baseInsert: Record<string, any> = {
    channel:                  "b2b_mayorista",
    customer_id:              clientId,
    status:                   initialStatus,
    subtotal:                 r(subtotal),
    shipping_fee:             0,
    discount:                 r(descuento),
    total:                    r(total),
    ideia_commission_rate:   0.15,
    ideia_commission_amount: 0,
    shipping_method:          "b2b_despacho",
    payment_method:           paymentMethod,
    notes:                    notes || null,
    delivery_zone_id:         zonaId ?? null,
    shipping_snapshot:        shippingSnapshot,
  };
  if (initialStatus === "aprobado") {
    baseInsert.aprobado_por = user.id;
    baseInsert.aprobado_at  = new Date().toISOString();
  }

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
    const { data: o, error: oErr } = await adminClient
      .from("orders")
      .insert({ ...baseInsert, order_number: orderNum } as any)
      .select("id")
      .single();
    if (!oErr && o) { order = o; break; }
    if (oErr?.code !== "23505") return { error: oErr?.message ?? "Error al crear el pedido" };
  }
  if (!order) return { error: "No se pudo generar número de pedido único. Intentá de nuevo." };

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
    unit_price: r(item.precio.final_civa),
    line_total: r(item.precio.final_civa * item.quantity),
  }));

  const { error: linesError } = await adminClient.from("order_lines").insert(lines as any);

  if (linesError) {
    await adminClient.from("orders").delete().eq("id", order.id);
    return { error: linesError.message };
  }

  // Email al cliente
  try {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", clientId)
      .single();

    const { data: authUser } = await adminClient.auth.admin.getUserById(clientId);
    const clientEmail = authUser?.user?.email;
    const clientName  = (profile as any)?.full_name ?? clientEmail ?? "Cliente";

    if (clientEmail) {
      await emailPedidoAdminCreado({
        orderId:       order.id,
        orderNumber:   orderNum,
        clientEmail,
        clientName,
        lines: items.map((i) => ({
          name:      i.name,
          qty:       i.quantity,
          unitPrice: i.precio.final_civa,
        })),
        total:         r(total),
        paymentMethod,
        initialStatus,
      });
    }
  } catch {
    // email no bloquea el pedido
  }

  return { orderId: order.id };
}
