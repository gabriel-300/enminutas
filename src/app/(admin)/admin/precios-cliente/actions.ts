"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function guardarPrecioCliente(payload: {
  clienteId: string;
  productoId: string;
  tipo: "precio_fijo" | "descuento_pct";
  precioFijo?: number;
  descuentoPct?: number;
  vigenteDesde: string;
  vigenteHasta?: string;
  notas?: string;
}): Promise<{ error?: string }> {
  try {
    const user = await getAdminUser();
    const db = createAdminClient() as any;

    if (payload.tipo === "precio_fijo" && (!payload.precioFijo || payload.precioFijo < 0))
      return { error: "Precio fijo inválido" };
    if (payload.tipo === "descuento_pct" && (payload.descuentoPct === undefined || payload.descuentoPct < 0 || payload.descuentoPct > 100))
      return { error: "Descuento debe estar entre 0 y 100" };

    const { error } = await db.from("precios_cliente").upsert(
      {
        cliente_id:    payload.clienteId,
        producto_id:   payload.productoId,
        tipo:          payload.tipo,
        precio_fijo:   payload.tipo === "precio_fijo" ? payload.precioFijo : null,
        descuento_pct: payload.tipo === "descuento_pct" ? payload.descuentoPct : null,
        vigente_desde: payload.vigenteDesde,
        vigente_hasta: payload.vigenteHasta || null,
        notas:         payload.notas?.trim() || null,
        created_by:    user.id,
      },
      { onConflict: "cliente_id,producto_id" }
    );

    if (error) return { error: error.message };
    revalidatePath("/admin/precios-cliente");
    revalidatePath(`/admin/precios-cliente/${payload.clienteId}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function eliminarPrecioCliente(id: string, clienteId: string): Promise<{ error?: string }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;
    const { error } = await db.from("precios_cliente").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/precios-cliente");
    revalidatePath(`/admin/precios-cliente/${clienteId}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
