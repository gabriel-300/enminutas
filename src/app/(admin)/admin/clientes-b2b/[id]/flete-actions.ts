"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

// override: fracción (0.02 = 2%). null = usar el % de la zona; 0 = sin flete para este cliente.
export async function actualizarFleteOverride(
  clienteId: string,
  override: number | null,
): Promise<Result> {
  try { await requireAdmin(); } catch { return { error: "Sin permiso" }; }

  if (override != null && (isNaN(override) || override < 0 || override >= 1)) {
    return { error: "El flete debe estar entre 0% y 99,99%" };
  }

  const db = createAdminClient() as any;
  const { error } = await db
    .from("profiles")
    .update({ flete_pct_override: override != null ? Math.round(override * 10000) / 10000 : null })
    .eq("id", clienteId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true };
}
