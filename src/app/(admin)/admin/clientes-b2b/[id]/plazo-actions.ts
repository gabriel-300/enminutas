"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

// dias: plazo de pago en días desde la entrega. null = usar el plazo por defecto (30); 0 = contado.
export async function actualizarPlazoPago(clienteId: string, dias: number | null): Promise<Result> {
  try { await requireAdmin(); } catch { return { error: "Sin permiso" }; }

  if (dias != null && (!Number.isInteger(dias) || dias < 0 || dias > 365)) {
    return { error: "El plazo debe ser un número entero de días entre 0 y 365" };
  }

  const db = createAdminClient() as any;
  const { error } = await db.from("profiles").update({ plazo_pago_dias: dias }).eq("id", clienteId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  revalidatePath("/admin/cuentas-corrientes");
  return { ok: true };
}
