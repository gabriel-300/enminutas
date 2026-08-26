"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

export async function registrarPago(formData: FormData): Promise<Result> {
  const clienteId  = (formData.get("cliente_id") as string)?.trim();
  const montoStr   = (formData.get("monto") as string)?.replace(",", ".").replace(/\s/g, "");
  const monto      = parseFloat(montoStr);
  const fecha      = (formData.get("fecha") as string)?.trim();
  const metodo     = (formData.get("metodo") as string)?.trim() || "transferencia";
  const referencia = (formData.get("referencia") as string)?.trim() || null;
  const notas      = (formData.get("notas") as string)?.trim() || null;

  if (!clienteId) return { error: "Cliente requerido" };
  if (isNaN(monto) || monto <= 0) return { error: "El monto debe ser mayor a cero" };
  if (!fecha) return { error: "La fecha es requerida" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const db = createAdminClient() as any;
  const { error } = await db.from("pagos").insert({
    cliente_id: clienteId,
    monto,
    fecha,
    metodo,
    referencia,
    notas,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true };
}

export async function eliminarPago(pagoId: string, clienteId: string): Promise<Result> {
  const db = createAdminClient() as any;
  const { error } = await db.from("pagos").delete().eq("id", pagoId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes-b2b/${clienteId}`);
  return { ok: true };
}
