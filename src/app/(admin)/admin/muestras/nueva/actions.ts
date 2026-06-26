"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ItemMuestra = {
  productId:  string;
  name:       string;
  quantity:   number;
};

export async function crearPedidoMuestra(payload: {
  destinatario: string;
  email:        string;
  phone:        string;
  notes:        string;
  items:        ItemMuestra[];
}): Promise<{ orderId: string } | { error: string }> {
  const { destinatario, email, phone, notes, items } = payload;

  if (!destinatario.trim()) return { error: "Ingresá el nombre del destinatario" };
  if (items.length === 0)    return { error: "Agregá al menos un producto" };

  const authClient  = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const callerRole = user.app_metadata?.role as string | undefined;
  if (!["admin", "vendedor"].includes(callerRole ?? "")) return { error: "No autorizado" };

  // Verificar que todos los productos existen y tienen es_muestra = true
  const productIds = items.map((i) => i.productId);
  const { data: productos } = await adminClient
    .from("products")
    .select("id, name, es_muestra")
    .in("id", productIds);

  const prodMap = new Map<string, any>((productos ?? []).map((p: any) => [p.id, p]));
  for (const item of items) {
    const prod = prodMap.get(item.productId);
    if (!prod)              return { error: `Producto "${item.name}" no encontrado` };
    if (!prod.es_muestra)   return { error: `"${item.name}" no está habilitado para muestras` };
  }

  // Generar número de orden MST-YYYY-NNNN
  const year = new Date().getFullYear();
  let order: { id: string } | null = null;
  let orderNum = "";

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: maxRow } = await adminClient
      .from("orders")
      .select("order_number")
      .like("order_number", `MST-${year}-%`)
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextSeq = 1;
    if (maxRow?.order_number) {
      const last = parseInt((maxRow.order_number as string).split("-").pop() ?? "0", 10);
      if (!isNaN(last)) nextSeq = last + 1;
    }
    orderNum = `MST-${year}-${String(nextSeq).padStart(4, "0")}`;

    const insertData: Record<string, any> = {
      order_number:           orderNum,
      channel:                "muestra",
      customer_id:            null,
      muestra_destinatario:   destinatario.trim(),
      guest_email:            email.trim() || null,
      guest_phone:            phone.trim() || null,
      status:                 "aprobado",
      aprobado_por:           user.id,
      aprobado_at:            new Date().toISOString(),
      subtotal:               0,
      shipping_fee:           0,
      discount:               0,
      total:                  0,
      ideia_commission_rate:  0,
      ideia_commission_amount: 0,
      shipping_method:        "muestra",
      payment_method:         "muestra",
      notes:                  notes.trim() || null,
    };

    const { data: o, error: oErr } = await adminClient
      .from("orders")
      .insert(insertData)
      .select("id")
      .single();

    if (!oErr && o) { order = o; break; }
    if (oErr?.code !== "23505") return { error: oErr?.message ?? "Error al crear la muestra" };
  }
  if (!order) return { error: "No se pudo generar número único. Intentá de nuevo." };

  // Insertar líneas (sin precio)
  const lines = items.map((item) => ({
    order_id:         order!.id,
    product_id:       item.productId,
    product_snapshot: { name: item.name, canal: "muestra" },
    quantity:         item.quantity,
    unit_price:       0,
    line_total:       0,
  }));

  const { error: linesErr } = await adminClient.from("order_lines").insert(lines);
  if (linesErr) {
    await adminClient.from("orders").delete().eq("id", order.id);
    return { error: linesErr.message };
  }

  // Log de evento
  await adminClient.from("order_events").insert({
    order_id:  order.id,
    status:    "aprobado",
    message:   `Muestra creada para ${destinatario.trim()}`,
    actor_id:  user.id,
  });

  revalidatePath("/admin/muestras");
  return { orderId: order.id };
}

export async function enviarMuestraAProd(orderId: string): Promise<void> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "produccion"].includes(role ?? "")) throw new Error("No autorizado");

  const db = createAdminClient() as any;
  const { data: updated, error } = await db
    .from("orders")
    .update({ status: "enviado_prod" })
    .eq("id", orderId)
    .eq("status", "aprobado")
    .eq("channel", "muestra")
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("La muestra debe estar aprobada para enviar a producción");

  await db.from("order_events").insert({
    order_id: orderId,
    status:   "enviado_prod",
    message:  "Muestra enviada a producción",
    actor_id: user.id,
  });
  revalidatePath("/admin/muestras");
}

export async function despacharMuestra(orderId: string): Promise<void> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "produccion"].includes(role ?? "")) throw new Error("No autorizado");

  const db = createAdminClient() as any;

  const { data: lines } = await db
    .from("order_lines")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  const { data: updated, error } = await db
    .from("orders")
    .update({ status: "despachado", despachado_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "enviado_prod")
    .eq("channel", "muestra")
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("La muestra debe estar en producción para despacharse");

  // Reducir stock — mismo mecanismo que pedidos regulares
  for (const line of (lines ?? []) as { product_id: string; quantity: number }[]) {
    await db.rpc("decrement_stock", { p_product_id: line.product_id, p_qty: line.quantity });
    await db.from("stock_movements").insert({
      product_id: line.product_id,
      qty:        -line.quantity,
      type:       "muestra",
      order_id:   orderId,
    });
  }

  await db.from("order_events").insert({
    order_id: orderId,
    status:   "despachado",
    message:  "Muestra despachada — stock reducido",
    actor_id: user.id,
  });
  revalidatePath("/admin/muestras");
  revalidatePath("/admin/stock");
}
