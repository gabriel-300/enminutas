"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export async function crearLiquidacion(periodStart: string, periodEnd: string, notes: string) {
  await requireAdmin();
  const db = createAdminClient() as any;

  // Calcular GMV y comisión desde pedidos en estado 'liquidado' dentro del período
  const { data: orders } = await db
    .from("orders")
    .select("total, ideia_commission_amount")
    .eq("status", "liquidado")
    .gte("created_at", `${periodStart}T00:00:00`)
    .lte("created_at", `${periodEnd}T23:59:59`);

  const rows = (orders ?? []) as { total: number; ideia_commission_amount: number }[];
  const total_gmv        = rows.reduce((s, o) => s + Number(o.total), 0);
  const total_commission = rows.reduce((s, o) => s + Number(o.ideia_commission_amount), 0);
  const orders_count     = rows.length;

  const { error } = await db.from("ideia_liquidations").insert({
    period_start:      periodStart,
    period_end:        periodEnd,
    total_gmv,
    total_commission,
    orders_count,
    status:            "draft",
    notes:             notes.trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/liquidaciones");
}

export async function marcarPagada(id: string) {
  await requireAdmin();
  const db = createAdminClient() as any;

  const { error } = await db
    .from("ideia_liquidations")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  if (error) throw new Error(error.message);
  revalidatePath("/admin/liquidaciones");
}

export async function eliminarLiquidacion(id: string) {
  await requireAdmin();
  const db = createAdminClient() as any;

  const { error } = await db
    .from("ideia_liquidations")
    .delete()
    .eq("id", id)
    .eq("status", "draft");

  if (error) throw new Error(error.message);
  revalidatePath("/admin/liquidaciones");
}
