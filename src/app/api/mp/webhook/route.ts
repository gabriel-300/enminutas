import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

// MP sends IPN notifications as POST with JSON body.
// Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/ipn
export async function POST(request: NextRequest) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "MP not configured" }, { status: 503 });
  }

  let body: { type?: string; data?: { id?: string | number } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle payment notifications
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId = String(body.data.id);

  const mp = new MercadoPagoConfig({ accessToken });
  const paymentClient = new Payment(mp);

  let payment: Awaited<ReturnType<typeof paymentClient.get>>;
  try {
    payment = await paymentClient.get({ id: paymentId });
  } catch (err) {
    console.error("[mp/webhook] fetch payment:", err);
    return NextResponse.json({ error: "Could not fetch payment" }, { status: 500 });
  }

  if (payment.status !== "approved") {
    // Not approved — nothing to do yet (pending/in_process handled separately)
    return NextResponse.json({ ok: true });
  }

  const orderId = payment.external_reference;
  if (!orderId) {
    console.warn("[mp/webhook] payment approved but no external_reference:", paymentId);
    return NextResponse.json({ ok: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn("[mp/webhook] Supabase not configured — skipping order update");
    return NextResponse.json({ ok: true });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      mp_payment_id: paymentId,
      payment_confirmed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending_payment"); // idempotency guard

  if (error) {
    console.error("[mp/webhook] update order:", error);
    // Return 200 so MP doesn't retry — the order may already be paid
  }

  return NextResponse.json({ ok: true });
}

// MP sometimes sends GET requests to verify the endpoint
export function GET() {
  return NextResponse.json({ ok: true });
}
