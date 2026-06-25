"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role;
  if (role !== "admin" && role !== "vendedor") throw new Error("No autorizado");
  return user;
}

export async function crearProspecto(payload: {
  empresa: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  zona?: string;
  valorEstimado?: number;
  preventistaId?: string;
  fechaProximoContacto?: string;
  notas?: string;
}): Promise<{ error?: string; id?: string }> {
  try {
    const user = await getAuthUser();
    const db = createAdminClient() as any;

    const { data, error } = await db.from("pipeline_prospectos").insert({
      empresa:                payload.empresa.trim(),
      contacto_nombre:        payload.contactoNombre?.trim() || null,
      contacto_telefono:      payload.contactoTelefono?.trim() || null,
      contacto_email:         payload.contactoEmail?.trim() || null,
      zona:                   payload.zona?.trim() || null,
      valor_estimado:         payload.valorEstimado ?? null,
      preventista_id:         payload.preventistaId || null,
      fecha_proximo_contacto: payload.fechaProximoContacto || null,
      notas:                  payload.notas?.trim() || null,
      created_by:             user.id,
    }).select("id").single();

    if (error) return { error: error.message };
    revalidatePath("/admin/pipeline");
    return { id: data.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function actualizarProspecto(id: string, payload: {
  empresa?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  zona?: string;
  estado?: string;
  valorEstimado?: number | null;
  preventistaId?: string | null;
  fechaProximoContacto?: string | null;
  notas?: string;
  motivoPerdida?: string;
}): Promise<{ error?: string }> {
  try {
    await getAuthUser();
    const db = createAdminClient() as any;

    const patch: Record<string, unknown> = {};
    if (payload.empresa             !== undefined) patch.empresa                 = payload.empresa.trim();
    if (payload.contactoNombre      !== undefined) patch.contacto_nombre         = payload.contactoNombre?.trim() || null;
    if (payload.contactoTelefono    !== undefined) patch.contacto_telefono       = payload.contactoTelefono?.trim() || null;
    if (payload.contactoEmail       !== undefined) patch.contacto_email          = payload.contactoEmail?.trim() || null;
    if (payload.zona                !== undefined) patch.zona                    = payload.zona?.trim() || null;
    if (payload.estado              !== undefined) patch.estado                  = payload.estado;
    if (payload.valorEstimado       !== undefined) patch.valor_estimado          = payload.valorEstimado;
    if (payload.preventistaId       !== undefined) patch.preventista_id          = payload.preventistaId;
    if (payload.fechaProximoContacto !== undefined) patch.fecha_proximo_contacto = payload.fechaProximoContacto;
    if (payload.notas               !== undefined) patch.notas                   = payload.notas?.trim() || null;
    if (payload.motivoPerdida       !== undefined) patch.motivo_perdida          = payload.motivoPerdida?.trim() || null;

    const { error } = await db.from("pipeline_prospectos").update(patch).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/pipeline");
    revalidatePath(`/admin/pipeline/${id}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function avanzarEstado(id: string, nuevoEstado: string, motivoPerdida?: string): Promise<{ error?: string }> {
  try {
    await getAuthUser();
    const db = createAdminClient() as any;

    const patch: Record<string, unknown> = { estado: nuevoEstado };
    if (nuevoEstado === "perdido" && motivoPerdida) patch.motivo_perdida = motivoPerdida.trim();

    const { error } = await db.from("pipeline_prospectos").update(patch).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/pipeline");
    revalidatePath(`/admin/pipeline/${id}`);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function eliminarProspecto(id: string): Promise<{ error?: string }> {
  try {
    const user = await getAuthUser();
    if (user.app_metadata?.role !== "admin") return { error: "Solo administradores pueden eliminar prospectos" };
    const db = createAdminClient() as any;
    const { error } = await db.from("pipeline_prospectos").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/pipeline");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
