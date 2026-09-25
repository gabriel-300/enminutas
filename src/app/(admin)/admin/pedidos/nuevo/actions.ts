"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { PrecioB2B } from "@/lib/b2b-pricing";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import { getActiveVolumeDiscounts } from "@/lib/volume-discounts-server";
import { calcVolumeDiscount } from "@/lib/volume-discounts";
import { emailPedidoAdminCreado } from "@/lib/email";
import { insertarPedidoB2B } from "@/lib/order-number";

type ItemPedido = {
  productId:  string;
  name:       string;
  unitLabel:  string | null;
  bolsasCaja: number | null;
  precio:     PrecioB2B;
  quantity:   number;
};

type CrearPedidoPayload = {
  clientId:        string;
  canal:           string;
  zonaId:          string | null;
  items:           ItemPedido[];
  notes:           string;
  paymentMethod:   string;
  initialStatus:   string;
  discountPct?:    number;
  discountAmount?: number;
  cargoAdicionalConcepto?: string | null;
  cargoAdicionalMonto?:    number;
  shippingAddress?: { calle: string | null; numero: string | null; piso: string | null; ciudad: string | null } | null;
};

export async function crearPedidoAdmin(payload: CrearPedidoPayload): Promise<{ orderId: string } | { error: string }> {
  const { clientId, canal, zonaId, items, notes, paymentMethod, initialStatus, shippingAddress } = payload;
  const cargoAdicionalMonto = Math.max(0, Number(payload.cargoAdicionalMonto ?? 0));
  if (isNaN(cargoAdicionalMonto)) return { error: "Monto de cargo adicional inválido" };

  if (!clientId)         return { error: "Seleccioná un cliente" };
  if (items.length === 0) return { error: "Agregá al menos un producto" };

  const authClient  = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const callerRole = user.app_metadata?.role as string | undefined;

  // Solo admin y vendedor pueden crear pedidos B2B
  if (!["admin", "vendedor"].includes(callerRole ?? "")) {
    return { error: "No autorizado" };
  }

  // Solo el admin puede aprobar directamente; vendedor siempre crea en pending_payment
  const safeStatus = (initialStatus === "aprobado" && callerRole !== "admin")
    ? "pending_payment"
    : initialStatus;

  // Vendedor solo puede crear pedidos para sus clientes asignados
  if (callerRole === "vendedor") {
    const { data: perfil } = await (adminClient as any)
      .from("profiles")
      .select("vendedor_id")
      .eq("id", clientId)
      .single();
    if (!perfil || perfil.vendedor_id !== user.id) {
      return { error: "No autorizado: el cliente no te pertenece" };
    }
  }

  const productIds = items.map((i) => i.productId);

  // Fetch datos de pricing server-side en paralelo
  const [params, clientProfileRes, productsRes, volumeDiscounts, zonaRes] = await Promise.all([
    getParametros(),
    (adminClient as any)
      .from("profiles")
      .select("comision_pct_override, canal:canales!canal_id (margen_std, margen_premium, markup_pvp)")
      .eq("id", clientId)
      .single(),
    (adminClient as any)
      .from("products")
      .select("id, costo, bolsas_caja, pkg_unitario, pkg_bulto, u_bolsa, categoria, divisiones_display, min_quantity_b2b")
      .in("id", productIds),
    getActiveVolumeDiscounts(),
    // Flete CIF de la zona de entrega: mismo % que usó la pantalla para mostrar precios
    zonaId
      ? (adminClient as any).from("delivery_zones").select("flete_pct").eq("id", zonaId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const fletePct = Number(zonaRes.data?.flete_pct ?? 0);

  const canalData = clientProfileRes.data?.canal as { margen_std: number; margen_premium: number; markup_pvp: number } | null | undefined;
  if (!canalData) return { error: "El cliente no tiene canal asignado" };

  const comisionPctCliente = clientProfileRes.data?.comision_pct_override != null
    ? Number(clientProfileRes.data.comision_pct_override)
    : params.comision_pct;

  // Validar cantidades mínimas y recalcular precios server-side
  const productMap  = new Map<string, any>((productsRes.data ?? []).map((p: any) => [p.id, p]));
  const serverPrices = new Map<string, number>();

  for (const item of items) {
    const prod = productMap.get(item.productId);
    if (!prod) return { error: `Producto "${item.name}" no encontrado` };

    const min = prod.min_quantity_b2b ?? 1;
    if (item.quantity < min) {
      return { error: `"${item.name}" requiere mínimo ${min} caja${min !== 1 ? "s" : ""} (cargaste ${item.quantity})` };
    }
    if (!prod.costo) return { error: `"${item.name}" no tiene costo configurado` };

    const precio = calcularPrecio({
      costo:              Number(prod.costo),
      bolsas_caja:        Number(prod.bolsas_caja),
      pkg_unitario:       Number(prod.pkg_unitario ?? 0),
      pkg_bulto:          Number(prod.pkg_bulto    ?? 0),
      u_bolsa:            Number(prod.u_bolsa),
      categoria:          prod.categoria,
      divisiones_display: prod.divisiones_display ?? null,
      margen_std:         Number(canalData.margen_std),
      margen_premium:     Number(canalData.margen_premium),
      markup_pvp:         Number(canalData.markup_pvp),
      iva_pct:            params.iva_pct,
      comision_pct:       comisionPctCliente,
      flete_pct:          fletePct,
    });
    serverPrices.set(item.productId, precio.final_civa);
  }

  // Calcular totales con precios server-side y descuento validado contra DB
  const r = (n: number) => Math.round(n * 100) / 100;
  const totalQty      = items.reduce((s, i) => s + i.quantity, 0);
  const subtotalBruto = items.reduce((s, i) => s + (serverPrices.get(i.productId) ?? 0) * i.quantity, 0);

  const validDiscount  = calcVolumeDiscount(volumeDiscounts, totalQty, subtotalBruto);
  const descuento      = Math.max(0, Math.min(subtotalBruto, validDiscount?.amount ?? 0));
  const total          = subtotalBruto - descuento + cargoAdicionalMonto;

  const shippingSnapshot = (shippingAddress?.calle || shippingAddress?.ciudad)
    ? {
        street: shippingAddress.calle  ?? null,
        number: shippingAddress.numero ?? null,
        floor:  shippingAddress.piso   ?? null,
        city:   shippingAddress.ciudad ?? null,
      }
    : null;

  const baseInsert: Record<string, any> = {
    channel:                 "b2b_mayorista",
    customer_id:             clientId,
    status:                  safeStatus,
    subtotal:                r(subtotalBruto),
    shipping_fee:            0,
    discount:                r(descuento),
    total:                   r(total),
    cargo_adicional_concepto: cargoAdicionalMonto > 0 ? (payload.cargoAdicionalConcepto?.trim() || null) : null,
    cargo_adicional_monto:   r(cargoAdicionalMonto),
    ideia_commission_rate:   0.15,
    ideia_commission_amount: 0,
    shipping_method:         "b2b_despacho",
    payment_method:          paymentMethod,
    notes:                   notes || null,
    delivery_zone_id:        zonaId ?? null,
    flete_pct:               fletePct,
    shipping_snapshot:       shippingSnapshot,
  };
  if (safeStatus === "aprobado") {
    baseInsert.aprobado_por = user.id;
    baseInsert.aprobado_at  = new Date().toISOString();
  }

  // Insertar con retry en caso de colisión de número (constraint UNIQUE)
  const inserted = await insertarPedidoB2B(adminClient, baseInsert);
  if ("error" in inserted) return { error: inserted.error };
  const order = { id: inserted.id };
  const orderNum = inserted.orderNumber;

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
    unit_price: r(serverPrices.get(item.productId)!),
    line_total: r((serverPrices.get(item.productId)!) * item.quantity),
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
          unitPrice: serverPrices.get(i.productId)!,
        })),
        total:         r(total),
        paymentMethod,
        initialStatus: safeStatus,
      });
    }
  } catch {
    // email no bloquea el pedido
  }

  return { orderId: order.id };
}
