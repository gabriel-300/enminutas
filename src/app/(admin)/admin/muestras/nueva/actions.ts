"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type ItemMuestra = {
  productId: string;
  quantity:  number;
};

export type PayloadMuestra = {
  /** Datos básicos del posible cliente */
  nombre:          string;
  contactoNombre:  string;
  email:           string;
  telefono:        string;
  direccion:       string;
  zonaId?:         string;
  /** Contacto ya existente: prospecto del Pipeline o cliente registrado (a lo sumo uno) */
  prospectoId?:    string;
  customerId?:     string;
  /** Contacto nuevo: guardarlo como prospecto del Pipeline para seguirlo */
  guardarProspecto: boolean;
  observacion:     string;
  notes:           string;
  items:           ItemMuestra[];
};

/**
 * La muestra es un pedido más (canal 'muestra', sin precio). El admin la crea ya aprobada; el
 * preventista (vendedor) la solicita y queda pendiente de aprobación. El stock NO se toca acá:
 * baja de los lotes al despacharla, igual que cualquier pedido (despacharPedidoConAjuste).
 */
export async function crearPedidoMuestra(p: PayloadMuestra): Promise<{ orderId: string } | { error: string }> {
  let user;
  try { user = await requireRole("admin", "vendedor"); } catch { return { error: "No autorizado" }; }
  const esAdmin = user.app_metadata?.role === "admin";

  const nombre    = p.nombre.trim();
  const direccion = p.direccion.trim();
  const items     = p.items.filter((i) => i.quantity > 0);

  if (!nombre)            return { error: "Ingresá el nombre del posible cliente" };
  if (!direccion)         return { error: "Ingresá la dirección donde enviar la muestra" };
  if (items.length === 0) return { error: "Agregá al menos un producto" };
  if (items.some((i) => !Number.isFinite(i.quantity))) return { error: "Cantidad inválida" };

  const db = createAdminClient() as any;

  // Solo presentaciones de muestra
  const { data: productos } = await db
    .from("products")
    .select("id, name, sku, unit_label, es_muestra, is_active")
    .in("id", items.map((i) => i.productId));
  const prodMap = new Map<string, any>((productos ?? []).map((x: any) => [x.id, x]));
  for (const item of items) {
    const prod = prodMap.get(item.productId);
    if (!prod)              return { error: "Producto no encontrado" };
    if (!prod.es_muestra)   return { error: `"${prod.name}" no es una presentación de muestra` };
    if (!prod.is_active)    return { error: `"${prod.name}" está inactivo` };
  }

  // Zona de entrega (para que Distribución la agrupe en la ruta)
  let zonaNombre: string | null = null;
  if (p.zonaId) {
    const { data: zona } = await db.from("delivery_zones").select("name").eq("id", p.zonaId).maybeSingle();
    zonaNombre = zona?.name ?? null;
  }

  // Prospecto del Pipeline: el existente se completa con lo cargado; el nuevo se crea si corresponde
  let prospectoId: string | null = p.prospectoId ?? null;
  const datosProspecto = {
    contacto_nombre:   p.contactoNombre.trim() || null,
    contacto_telefono: p.telefono.trim() || null,
    contacto_email:    p.email.trim() || null,
    direccion,
    ...(zonaNombre ? { zona: zonaNombre } : {}),
  };
  if (prospectoId) {
    await db.from("pipeline_prospectos").update(datosProspecto).eq("id", prospectoId);
  } else if (!p.customerId && p.guardarProspecto) {
    const { data: nuevo, error: errP } = await db
      .from("pipeline_prospectos")
      .insert({
        empresa:        nombre,
        ...datosProspecto,
        preventista_id: esAdmin ? null : user.id,
        notas:          p.observacion.trim() || null,
        created_by:     user.id,
      })
      .select("id")
      .single();
    if (errP) return { error: `No se pudo guardar el prospecto: ${errP.message}` };
    prospectoId = nuevo.id;
  }

  // Número MST-YYYY-NNNN (reintenta si dos muestras chocan en el número)
  const year = new Date().getFullYear();
  const now  = new Date().toISOString();
  let order: { id: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: maxRow } = await db
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
    const orderNum = `MST-${year}-${String(nextSeq).padStart(4, "0")}`;

    const { data: o, error: oErr } = await db
      .from("orders")
      .insert({
        order_number:            orderNum,
        channel:                 "muestra",
        customer_id:             p.customerId ?? null,
        muestra_destinatario:    nombre,
        muestra_contacto:        p.contactoNombre.trim() || null,
        muestra_observacion:     p.observacion.trim() || null,
        muestra_prospecto_id:    prospectoId,
        solicitado_por:          user.id,
        guest_email:             p.email.trim() || null,
        guest_phone:             p.telefono.trim() || null,
        status:                  esAdmin ? "aprobado" : "pending_payment",
        ...(esAdmin ? { aprobado_por: user.id, aprobado_at: now } : {}),
        delivery_zone_id:        p.zonaId || null,
        shipping_snapshot:       { street: direccion, number: null, floor: null, city: null },
        subtotal:                0,
        shipping_fee:            0,
        discount:                0,
        total:                   0,
        ideia_commission_rate:   0,
        ideia_commission_amount: 0,
        shipping_method:         "b2b_despacho",
        payment_method:          "muestra",
        notes:                   p.notes.trim() || null,
      })
      .select("id")
      .single();

    if (!oErr && o) { order = o; break; }
    if (oErr?.code !== "23505") return { error: oErr?.message ?? "Error al crear la muestra" };
  }
  if (!order) return { error: "No se pudo generar número único. Intentá de nuevo." };

  const lines = items.map((item) => {
    const prod = prodMap.get(item.productId);
    return {
      order_id:         order!.id,
      product_id:       item.productId,
      product_snapshot: { name: prod.name, sku: prod.sku, unit_label: prod.unit_label, canal: "muestra" },
      quantity:         item.quantity,
      unit_price:       0,
      line_total:       0,
    };
  });

  const { error: linesErr } = await db.from("order_lines").insert(lines);
  if (linesErr) {
    await db.from("orders").delete().eq("id", order.id);
    return { error: linesErr.message };
  }

  await db.from("order_events").insert({
    order_id: order.id,
    status:   esAdmin ? "aprobado" : "pending_payment",
    message:  esAdmin ? `Muestra creada y aprobada para ${nombre}` : `Muestra solicitada para ${nombre}`,
    actor_id: user.id,
  });

  revalidatePath("/admin/muestras");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/pipeline");
  return { orderId: order.id };
}
