"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export type ComisionClienteItem = {
  clienteId: string;
  monto:     number;
  pct:       number;
  ventas:    number;
};

// Marca como pagada la comisión de uno o varios clientes puntuales, para un
// vendedor y mes dados — permite pagar de a poco según flujo de caja, en vez
// de tener que liquidar todo el mes junto.
export async function marcarComisionesPagadas(payload: {
  vendedorId: string;
  mes:        string; // 'YYYY-MM'
  fechaPago:  string; // 'YYYY-MM-DD'
  notas?:     string | null;
  items:      ComisionClienteItem[];
}): Promise<{ error: string } | { ok: true }> {
  try {
    const user = await getAdminUser();

    if (!payload.vendedorId) return { error: "Vendedor requerido" };
    if (!/^\d{4}-\d{2}$/.test(payload.mes)) return { error: "Mes inválido" };
    if (!payload.fechaPago) return { error: "Fecha requerida" };
    if (!payload.items.length) return { error: "Seleccioná al menos un cliente" };
    if (payload.items.some((it) => isNaN(it.monto) || it.monto < 0))
      return { error: "Monto inválido" };

    const db = createAdminClient() as any;
    const rows = payload.items.map((it) => ({
      vendedor_id: payload.vendedorId,
      cliente_id:  it.clienteId,
      mes:         payload.mes,
      monto:       it.monto,
      pct:         it.pct,
      ventas:      it.ventas,
      fecha_pago:  payload.fechaPago,
      notas:       payload.notas?.trim() || null,
      created_by:  user.id,
    }));

    const { error } = await db.from("comisiones_pagos").upsert(rows, { onConflict: "vendedor_id,mes,cliente_id" });
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
  clienteId: string,
): Promise<{ error: string } | { ok: true }> {
  try {
    await getAdminUser();
    const db = createAdminClient() as any;
    const { error } = await db
      .from("comisiones_pagos")
      .delete()
      .eq("vendedor_id", vendedorId)
      .eq("mes", mes)
      .eq("cliente_id", clienteId);
    if (error) return { error: error.message };
    revalidatePath("/admin/comisiones");
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
