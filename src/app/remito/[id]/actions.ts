"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function guardarFirma(
  orderId: string,
  firmaData: string,
  aclaracion: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    const role = user.app_metadata?.role;
    const STAFF = ["admin", "vendedor", "produccion", "distribucion"];

    const db = createAdminClient() as any;

    // Verificar que el user es staff o dueño del pedido
    const { data: order } = await db
      .from("orders")
      .select("customer_id")
      .eq("id", orderId)
      .single();

    if (!order) return { error: "Pedido no encontrado" };
    if (!STAFF.includes(role) && order.customer_id !== user.id)
      return { error: "No autorizado" };

    // Validar tamaño razonable de la firma (max ~200KB base64)
    if (firmaData.length > 300_000) return { error: "La firma es demasiado grande" };

    const { error } = await db
      .from("orders")
      .update({
        firma_data:       firmaData,
        firma_fecha:      new Date().toISOString(),
        firma_aclaracion: aclaracion.trim() || null,
      })
      .eq("id", orderId);

    if (error) return { error: error.message };
    revalidatePath(`/remito/${orderId}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
