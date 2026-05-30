"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

export async function guardarMeta(formData: FormData): Promise<Result> {
  const vendedorId = formData.get("vendedor_id") as string;
  const mes        = formData.get("mes") as string;
  const objetivo   = parseFloat(formData.get("objetivo") as string) || 0;

  if (!vendedorId || !mes) return { error: "Datos incompletos" };

  const db = createAdminClient() as any;

  const { error } = await db
    .from("sales_goals")
    .upsert({ vendedor_id: vendedorId, mes, objetivo }, { onConflict: "vendedor_id,mes" });

  if (error) return { error: error.message };

  revalidatePath("/admin/preventista");
  return { ok: true };
}
