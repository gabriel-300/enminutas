"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function marcarComisionPagada(payload: {
  vendedorId: string;
  mes:        string; // 'YYYY-MM'
  monto:      number;
  pct:        number;
  ventasBase: number;
  fechaPago:  string; // 'YYYY-MM-DD'
  notas?:     string | null;
}): Promise<{ error: string } | { ok: true }> {
  try {
    const user = await getAdminUser();

    if (!payload.vendedorId) return { error: "Vendedor requerido" };
    if (!/^\d{4}-\d{2}$/.test(payload.mes)) return { error: "Mes inválido" };
    if (!payload.fechaPago) return { error: "Fecha requerida" };
    if (isNaN(payload.monto) || payload.monto < 0) return { error: "Monto inválido" };

    const db = createAdminClient() as any;
    const { error } = await db.from("comisiones_pagos").upsert(
      {
        vendedor_id: payload.vendedorId,
        mes:         payload.mes,
        monto:       payload.monto,
        pct:         payload.pct,
        ventas_base: payload.ventasBase,
        fecha_pago:  payload.fechaPago,
        notas:       payload.notas?.trim() || null,
        created_by:  user.id,
      },
      { onConflict: "vendedor_id,mes" },
    );

    if (error) return { error: error.message };

    revalidatePath("/admin/comisiones");
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function revertirComisionPagada(
  vendedorId: string,
  mes: string,
): Promise<{ error: string } | { ok: true }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;
    const { error } = await db
      .from("comisiones_pagos")
      .delete()
      .eq("vendedor_id", vendedorId)
      .eq("mes", mes);
    if (error) return { error: error.message };
    revalidatePath("/admin/comisiones");
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
