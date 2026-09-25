"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

// override: fracción (0.12 = 12%); 0 = el cliente no lleva comisión en su precio; null = usar el % global.
export async function actualizarComisionOverride(
  clienteId: string,
  override: number | null,
): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Sin permiso" };
  }
  if (override !== null && (typeof override !== "number" || !Number.isFinite(override) || override < 0 || override >= 1))
    return { error: "El % de comisión debe estar entre 0 y 99,99" };

  const db = createAdminClient() as any;
  const { error } = await db
    .from("profiles")
    .update({ comision_pct_override: override })
    .eq("id", clienteId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  revalidatePath("/admin/comisiones");
  return { ok: true };
}
