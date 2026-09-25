"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { cargarComisionesAnio } from "@/lib/comisiones-data";
import { mesValido } from "@/lib/fecha";
import { revalidatePath } from "next/cache";

// Marca como pagada la comisión de uno o varios clientes puntuales, para un
// vendedor y mes dados — permite pagar de a poco según flujo de caja, en vez
// de tener que liquidar todo el mes junto.
//
// Los montos NO vienen del navegador: se recalculan acá con el mismo cálculo que muestra la pantalla,
// así lo que se congela es lo vigente en la base y no lo que había cuando se cargó la página.
// Si el cliente ya estaba pagado y después hubo más entregas en ese mes, el pago se actualiza al nuevo
// total y queda anotado cuánto ya se había pagado (ver "extra" en la pantalla).
export async function marcarComisionesPagadas(payload: {
  vendedorId: string;
  mes:        string; // 'YYYY-MM'
  fechaPago:  string; // 'YYYY-MM-DD'
  notas?:     string | null;
  clienteIds: string[];
}): Promise<{ error: string } | { ok: true }> {
  try {
    const user = await requireAdmin();

    const mes = mesValido(payload.mes);
    if (!payload.vendedorId) return { error: "Vendedor requerido" };
    if (!mes) return { error: "Mes inválido" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.fechaPago ?? "")) return { error: "Fecha inválida" };
    if (!payload.clienteIds?.length) return { error: "Seleccioná al menos un cliente" };

    const db = createAdminClient() as any;
    const { agg } = await cargarComisionesAnio(Number(mes.slice(0, 4)));
    const delMes = agg[payload.vendedorId]?.[mes] ?? {};

    const { data: existentes } = await db
      .from("comisiones_pagos")
      .select("cliente_id, monto, fecha_pago, notas")
      .eq("vendedor_id", payload.vendedorId)
      .eq("mes", mes)
      .in("cliente_id", payload.clienteIds);
    const pagoPrevio = new Map<string, any>((existentes ?? []).map((p: any) => [p.cliente_id, p]));

    const notaUsuario = payload.notas?.trim() || null;
    const rows: Record<string, unknown>[] = [];
    for (const clienteId of new Set(payload.clienteIds)) {
      const live = delMes[clienteId];
      // Puede ser negativo: una devolución que se descuenta de lo que se le paga al vendedor.
      const monto = live ? Math.round(live.comisionLive) : 0;
      if (monto === 0) continue;

      const previo = pagoPrevio.get(clienteId);
      let notas = notaUsuario;
      if (previo) {
        // Ya pagado: solo se vuelve a registrar si cambió el monto (entregas nuevas o devoluciones).
        if (Math.abs(monto - Number(previo.monto)) < 1) continue;
        const aviso = `Incluye ajuste: ya se habían pagado $${Number(previo.monto)} el ${previo.fecha_pago}`;
        notas = [previo.notas, notaUsuario, aviso].filter(Boolean).join(" · ");
      }
      rows.push({
        vendedor_id: payload.vendedorId,
        cliente_id:  clienteId,
        mes,
        monto,
        pct:         live.pct,
        ventas:      live.ventas,
        fecha_pago:  payload.fechaPago,
        notas,
        created_by:  user.id,
      });
    }
    if (rows.length === 0) return { error: "Ninguno de los clientes seleccionados tiene comisión pendiente de pago" };

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
    await requireAdmin();
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
