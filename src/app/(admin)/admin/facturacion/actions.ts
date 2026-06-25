"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export type FacturaItemInput = {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  alicuota_iva: number; // 0 | 10.5 | 21
};

export type NuevaFacturaPayload = {
  tipo: "A" | "B" | "C" | "NC";
  punto_venta: number;
  cliente_id: string | null;
  razon_social: string;
  cuit: string;
  condicion_iva: string;
  domicilio_fiscal: string;
  fecha_vencimiento: string | null;
  pedido_refs: string[];
  condicion_pago: string;
  observaciones: string;
  items: FacturaItemInput[];
};

function calcTotales(items: FacturaItemInput[]) {
  let neto_gravado_21  = 0;
  let neto_gravado_105 = 0;
  let neto_no_gravado  = 0;

  for (const it of items) {
    const sub = Math.round(it.cantidad * it.precio_unitario * 100) / 100;
    if (it.alicuota_iva === 21)        neto_gravado_21  += sub;
    else if (it.alicuota_iva === 10.5) neto_gravado_105 += sub;
    else                               neto_no_gravado  += sub;
  }

  const r = (n: number) => Math.round(n * 100) / 100;
  const iva_21  = r(neto_gravado_21  * 0.21);
  const iva_105 = r(neto_gravado_105 * 0.105);
  const total   = r(neto_gravado_21 + neto_gravado_105 + neto_no_gravado + iva_21 + iva_105);

  return { neto_gravado_21: r(neto_gravado_21), neto_gravado_105: r(neto_gravado_105), neto_no_gravado: r(neto_no_gravado), iva_21, iva_105, total };
}

// ── Crear borrador ─────────────────────────────────────────────────
export async function crearFactura(
  payload: NuevaFacturaPayload
): Promise<{ id?: string; error?: string }> {
  try {
    const user = await requireAdmin();
    const db   = createAdminClient() as any;

    if (!payload.razon_social.trim()) throw new Error("Razón social requerida");
    if (!payload.cuit.trim())          throw new Error("CUIT requerido");
    if (payload.items.length === 0)    throw new Error("Agregá al menos un ítem");

    const totales = calcTotales(payload.items);

    const { data: factura, error: errF } = await db
      .from("facturas")
      .insert({
        tipo:              payload.tipo,
        punto_venta:       payload.punto_venta,
        cliente_id:        payload.cliente_id,
        razon_social:      payload.razon_social.trim(),
        cuit:              payload.cuit.trim(),
        condicion_iva:     payload.condicion_iva,
        domicilio_fiscal:  payload.domicilio_fiscal.trim() || null,
        fecha_vencimiento: payload.fecha_vencimiento || null,
        pedido_refs:       payload.pedido_refs.filter(Boolean),
        condicion_pago:    payload.condicion_pago,
        observaciones:     payload.observaciones.trim() || null,
        created_by:        user.id,
        estado:            "borrador",
        ...totales,
      })
      .select("id")
      .single();

    if (errF) throw new Error(errF.message);

    const rows = payload.items.map((it, i) => {
      const sub = Math.round(it.cantidad * it.precio_unitario * 100) / 100;
      const iva = Math.round(sub * (it.alicuota_iva / 100) * 100) / 100;
      return {
        factura_id:      factura.id,
        orden:           i + 1,
        descripcion:     it.descripcion,
        cantidad:        it.cantidad,
        unidad:          it.unidad,
        precio_unitario: it.precio_unitario,
        alicuota_iva:    it.alicuota_iva,
        subtotal:        sub,
        iva_monto:       iva,
        total:           Math.round((sub + iva) * 100) / 100,
      };
    });

    const { error: errI } = await db.from("factura_items").insert(rows);
    if (errI) throw new Error(errI.message);

    revalidatePath("/admin/facturacion");
    return { id: factura.id };
  } catch (err: any) {
    return { error: err.message ?? "Error al crear factura" };
  }
}

// ── Emitir (borrador → emitida, asigna número) ────────────────────
export async function emitirFactura(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;

    const { data: f } = await db
      .from("facturas")
      .select("tipo, punto_venta, estado")
      .eq("id", id)
      .single();

    if (!f) throw new Error("Factura no encontrada");
    if (f.estado !== "borrador") throw new Error("Solo se puede emitir un borrador");

    // Siguiente número para este tipo + punto de venta
    const { data: last } = await db
      .from("facturas")
      .select("numero")
      .eq("tipo", f.tipo)
      .eq("punto_venta", f.punto_venta)
      .not("numero", "is", null)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();

    const numero = (last?.numero ?? 0) + 1;

    const { error } = await db
      .from("facturas")
      .update({
        estado:        "emitida",
        numero,
        fecha_emision: new Date().toISOString().split("T")[0],
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/facturacion");
    revalidatePath(`/admin/facturacion/${id}`);
    return {};
  } catch (err: any) {
    return { error: err.message ?? "Error al emitir" };
  }
}

// ── Marcar cobrada ─────────────────────────────────────────────────
export async function marcarCobrada(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { error } = await db
      .from("facturas")
      .update({ estado: "cobrada" })
      .eq("id", id)
      .eq("estado", "emitida");
    if (error) throw new Error(error.message);
    revalidatePath("/admin/facturacion");
    revalidatePath(`/admin/facturacion/${id}`);
    return {};
  } catch (err: any) {
    return { error: err.message ?? "Error" };
  }
}

// ── Anular ────────────────────────────────────────────────────────
export async function anularFactura(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { error } = await db
      .from("facturas")
      .update({ estado: "anulada" })
      .eq("id", id)
      .in("estado", ["borrador", "emitida"]);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/facturacion");
    revalidatePath(`/admin/facturacion/${id}`);
    return {};
  } catch (err: any) {
    return { error: err.message ?? "Error" };
  }
}
