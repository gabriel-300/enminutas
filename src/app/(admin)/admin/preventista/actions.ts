"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

export async function guardarMeta(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") return { error: "No autorizado" };

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

export async function registrarContacto(formData: FormData): Promise<Result> {
  const clienteId = formData.get("cliente_id") as string;
  const tipo      = (formData.get("tipo") as string) || "contacto";
  const notas     = (formData.get("notas") as string | null)?.trim() || null;

  if (!clienteId) return { error: "Cliente requerido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "vendedor") return { error: "No autorizado" };

  const db = createAdminClient() as any;

  // Vendedor solo puede registrar contactos de sus propios clientes
  if (role === "vendedor") {
    const { data: perfil } = await db.from("profiles").select("vendedor_id").eq("id", clienteId).single();
    if (!perfil || perfil.vendedor_id !== user.id) return { error: "No autorizado" };
  }

  const { error } = await db.from("contact_logs").insert({
    vendedor_id: user.id,
    cliente_id:  clienteId,
    tipo,
    notas,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/preventista");
  return { ok: true };
}

export async function guardarNotasCliente(clienteId: string, notas: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "vendedor") return { error: "No autorizado" };

  const db = createAdminClient() as any;

  if (role === "vendedor") {
    const { data: perfil } = await db.from("profiles").select("vendedor_id").eq("id", clienteId).single();
    if (!perfil || perfil.vendedor_id !== user.id) return { error: "No autorizado" };
  }

  const { error } = await db.from("profiles").update({ notas_internas: notas || null }).eq("id", clienteId);
  if (error) return { error: error.message };
  revalidatePath("/admin/preventista");
  revalidatePath("/admin/clientes-b2b");
  return { ok: true };
}
