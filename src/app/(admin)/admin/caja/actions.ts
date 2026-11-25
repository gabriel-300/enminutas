"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type PosicionCaja = {
  saldoBanco:          number;
  saldoBancoFecha:     string | null;
  saldoBancoNotas:     string | null;
  cobrosConfirmados:   number;
  deudaProveedores:    number;
  opPendientes:        number;
  posicion:            number;
};

// Saldo Banco Macro + cobros confirmados (pagos de clientes desde la última carga del saldo,
// para no duplicar lo que el saldo ya refleja) − deuda a proveedores − órdenes de pago pendientes
// de ejecutar (borrador + aprobada). No hay API del banco: el saldo se carga a mano (tarea 85).
export async function getPosicionCaja(): Promise<PosicionCaja> {
  await requireRole("admin", "caja");
  const db = createAdminClient() as any;

  const [{ data: ultimoSaldo }, { data: saldosProveedores }, { data: opPendientes }] = await Promise.all([
    db.from("caja_saldo_banco").select("saldo, notas, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.rpc("proveedores_saldos"),
    db.from("ordenes_pago").select("monto").in("estado", ["borrador", "aprobada"]),
  ]);

  const saldoBanco      = Number(ultimoSaldo?.saldo ?? 0);
  const saldoBancoFecha = ultimoSaldo?.created_at ?? null;

  // Sin saldo todavía cargado no hay desde cuándo contar: 0 en vez de sumar todo el histórico de pagos.
  const { data: cobrosRaw } = saldoBancoFecha
    ? await db.from("pagos").select("monto").gt("created_at", saldoBancoFecha)
    : { data: [] };

  const cobrosConfirmados = ((cobrosRaw ?? []) as any[]).reduce((s, p) => s + Number(p.monto), 0);
  const deudaProveedores  = ((saldosProveedores ?? []) as any[]).reduce((s, p) => s + Number(p.saldo), 0);
  const opPendientesTotal = ((opPendientes ?? []) as any[]).reduce((s, o) => s + Number(o.monto), 0);

  return {
    saldoBanco,
    saldoBancoFecha,
    saldoBancoNotas:   ultimoSaldo?.notas ?? null,
    cobrosConfirmados,
    deudaProveedores,
    opPendientes:      opPendientesTotal,
    posicion:          saldoBanco + cobrosConfirmados - deudaProveedores - opPendientesTotal,
  };
}

export async function actualizarSaldoBanco(saldo: number, notas?: string | null): Promise<{ error?: string }> {
  const user = await requireRole("admin", "caja");
  if (!Number.isFinite(saldo)) return { error: "El saldo debe ser un número" };

  const db = createAdminClient() as any;
  const { error } = await db.from("caja_saldo_banco").insert({
    saldo,
    notas:      notas?.trim() || null,
    creado_por: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
  return {};
}
