import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { z } from "zod";
import { emailPedidoB2CRecibido, emailNuevoPedidoB2CAdmin } from "@/lib/email";

const ItemSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  unitLabel: z.string(),
  imageUrl: z.string().nullable().optional(),
});

const BodySchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  street: z.string().min(3),
  number: z.string().min(1),
  city: z.string().min(2),
  province: z.string().min(2),
  postalCode: z.string().length(4),
  paymentMethod: z.enum(["mercadopago", "bank_transfer"]),
  notes: z.string().optional(),
  items: z.array(ItemSchema).min(1),
  shippingFee: z.number().nonnegative().max(20000),
});

type Body = z.infer<typeof BodySchema>;

const IDEAIA_RATE = 0.10;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const subtotal = data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + data.shippingFee;
  const commissionAmount = +(total * IDEAIA_RATE).toFixed(2);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    return createOrderInSupabase({
      data, subtotal, total, commissionAmount, supabaseUrl, serviceKey,
    });
  }

  // Dev fallback — no Supabase configured yet
  return createDevOrder(data, total);
}

// ─── Supabase path ────────────────────────────────────────────────────────────

async function createOrderInSupabase({
  data, subtotal, total, commissionAmount, supabaseUrl, serviceKey,
}: {
  data: Body;
  subtotal: number;
  total: number;
  commissionAmount: number;
  supabaseUrl: string;
  serviceKey: string;
}) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const shippingSnapshot = {
    fullName: data.fullName,
    street: data.street,
    number: data.number,
    city: data.city,
    province: data.province,
    postalCode: data.postalCode,
    phone: data.phone,
    notes: data.notes ?? null,
  };

  // Insert order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      channel: "b2c_nacional",
      guest_email: data.email,
      guest_phone: data.phone,
      status: "pending_payment",
      subtotal,
      shipping_fee: data.shippingFee,
      total,
      ideaia_commission_rate: IDEAIA_RATE,
      ideaia_commission_amount: commissionAmount,
      shipping_method: "correo_argentino",
      shipping_snapshot: shippingSnapshot,
      payment_method: data.paymentMethod,
      notes: data.notes ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    console.error("[orders/create] insert order:", orderErr);
    return NextResponse.json(
      { error: "Error al crear el pedido", detail: orderErr?.message, hint: orderErr?.hint },
      { status: 500 }
    );
  }

  // Look up product IDs by SKU (mock IDs in cart won't match DB UUIDs)
  const skus = data.items.map((i) => i.sku);
  const { data: dbProducts } = await supabase
    .from("products")
    .select("id, sku")
    .in("sku", skus);

  const skuToId = new Map(dbProducts?.map((p) => [p.sku, p.id]) ?? []);

  const lines = data.items
    .filter((i) => skuToId.has(i.sku))
    .map((i) => ({
      order_id: order.id,
      product_id: skuToId.get(i.sku)!,
      product_snapshot: { sku: i.sku, name: i.name, unitLabel: i.unitLabel, imageUrl: i.imageUrl },
      quantity: i.quantity,
      unit_price: i.price,
      line_total: +(i.price * i.quantity).toFixed(2),
    }));

  if (lines.length > 0) {
    const { error: linesErr } = await supabase.from("order_lines").insert(lines);
    if (linesErr) console.error("[orders/create] insert lines:", linesErr);
  }

  // Email de confirmación al cliente — fire and forget
  emailPedidoB2CRecibido({
    orderNumber:   order.order_number,
    clientEmail:   data.email,
    clientName:    data.fullName,
    total,
    paymentMethod: data.paymentMethod,
  }).catch(() => {});

  // Aviso al admin — fire and forget
  emailNuevoPedidoB2CAdmin({
    orderId:     order.id,
    orderNumber: order.order_number,
    clientName:  data.fullName,
    clientEmail: data.email,
    total,
    items: data.items.map((i) => ({ name: i.name, qty: i.quantity, unitPrice: i.price })),
  }).catch(() => {});

  if (data.paymentMethod === "mercadopago") {
    return createMPPreference(supabase, order, data, total);
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
    total,
  });
}

// ─── Mercado Pago preference ──────────────────────────────────────────────────

async function createMPPreference(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  order: { id: string; order_number: string },
  data: Body,
  total: number,
) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    // MP not configured — send user to confirmation directly (dev UX)
    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      initPoint: null,
      total,
    });
  }

  const mp = new MercadoPagoConfig({ accessToken });
  const prefClient = new Preference(mp);

  try {
    const pref = await prefClient.create({
      body: {
        external_reference: order.id,
        items: data.items.map((i) => ({
          id: i.sku,
          title: i.name,
          quantity: i.quantity,
          unit_price: i.price,
          currency_id: "ARS",
        })),
        payer: {
          name: data.fullName,
          email: data.email,
          phone: { area_code: "0", number: data.phone },
        },
        back_urls: {
          success: `${APP_URL}/checkout/confirmacion/${order.id}?method=mp&number=${encodeURIComponent(order.order_number)}&total=${Math.round(total)}`,
          failure: `${APP_URL}/checkout/envio?error=mp_failure`,
          pending: `${APP_URL}/checkout/confirmacion/${order.id}?method=mp&status=pending&number=${encodeURIComponent(order.order_number)}&total=${Math.round(total)}`,
        },
        auto_return: "approved",
        notification_url: `${APP_URL}/api/mp/webhook`,
        statement_descriptor: "EN MINUTAS",
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }],
        },
      },
    });

    await supabase
      .from("orders")
      .update({ mp_preference_id: pref.id })
      .eq("id", order.id);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      initPoint: pref.init_point,
      total,
    });
  } catch (err) {
    console.error("[orders/create] MP preference:", err);
    return NextResponse.json({ error: "Error al crear preferencia de pago" }, { status: 500 });
  }
}

// ─── Dev fallback (no Supabase) ───────────────────────────────────────────────

async function createDevOrder(data: Body, total: number) {
  const fakeId = `dev-${Date.now()}`;
  const fakeNumber = `EM-2026-${Math.floor(Math.random() * 90000 + 10000)}`;

  if (data.paymentMethod === "mercadopago" && process.env.MP_ACCESS_TOKEN) {
    const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const prefClient = new Preference(mp);
    try {
      const pref = await prefClient.create({
        body: {
          external_reference: fakeId,
          items: data.items.map((i) => ({
            id: i.sku,
            title: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            currency_id: "ARS",
          })),
          payer: { email: data.email },
          back_urls: {
            success: `${APP_URL}/checkout/confirmacion/${fakeId}?method=mp&number=${encodeURIComponent(fakeNumber)}&total=${Math.round(total)}`,
            failure: `${APP_URL}/checkout/envio?error=mp_failure`,
            pending: `${APP_URL}/checkout/confirmacion/${fakeId}?method=mp&status=pending&number=${encodeURIComponent(fakeNumber)}&total=${Math.round(total)}`,
          },
          auto_return: "approved",
          notification_url: `${APP_URL}/api/mp/webhook`,
        },
      });
      return NextResponse.json({ orderId: fakeId, orderNumber: fakeNumber, initPoint: pref.init_point, total });
    } catch (err) {
      console.error("[orders/create] dev MP preference:", err);
    }
  }

  return NextResponse.json({ orderId: fakeId, orderNumber: fakeNumber, initPoint: null, total });
}
