"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

export async function actualizarComisionOverride(
  clienteId: string,
  override: number | null,
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") return { error: "Sin permiso" };

  const db = createAdminClient() as any;
  const { error } = await db
    .from("profiles")
    .update({ comision_pct_override: override })
    .eq("id", clienteId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true };
}
