"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireStaff() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "vendedor"].includes(role ?? "")) throw new Error("No autorizado");
  return user;
}

export async function agregarDireccion(profileId: string, formData: FormData) {
  await requireStaff();
  const supabase = createAdminClient();

  const alias  = (formData.get("alias")  as string | null)?.trim() || "Sin nombre";
  const calle  = (formData.get("calle")  as string | null)?.trim() || null;
  const numero = (formData.get("numero") as string | null)?.trim() || null;
  const piso   = (formData.get("piso")   as string | null)?.trim() || null;
  const ciudad = (formData.get("ciudad") as string | null)?.trim() || null;
  const zonaId = (formData.get("zona_id") as string | null)?.trim() || null;
  const esPrincipal = formData.get("es_principal") === "on";

  // Si se marca como principal, desmarcar las demás
  if (esPrincipal) {
    await (supabase as any)
      .from("direcciones_entrega")
      .update({ es_principal: false })
      .eq("profile_id", profileId);
  }

  const { error } = await (supabase as any).from("direcciones_entrega").insert({
    profile_id: profileId,
    alias, calle, numero, piso, ciudad,
    zona_id: zonaId,
    es_principal: esPrincipal,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clientes-b2b/${profileId}`);
}

export async function editarDireccion(id: string, profileId: string, formData: FormData) {
  await requireStaff();
  const supabase = createAdminClient();

  const alias  = (formData.get("alias")  as string | null)?.trim() || "Sin nombre";
  const calle  = (formData.get("calle")  as string | null)?.trim() || null;
  const numero = (formData.get("numero") as string | null)?.trim() || null;
  const piso   = (formData.get("piso")   as string | null)?.trim() || null;
  const ciudad = (formData.get("ciudad") as string | null)?.trim() || null;
  const zonaId = (formData.get("zona_id") as string | null)?.trim() || null;
  const esPrincipal = formData.get("es_principal") === "on";

  if (esPrincipal) {
    await (supabase as any)
      .from("direcciones_entrega")
      .update({ es_principal: false })
      .eq("profile_id", profileId);
  }

  const { error } = await (supabase as any)
    .from("direcciones_entrega")
    .update({ alias, calle, numero, piso, ciudad, zona_id: zonaId, es_principal: esPrincipal })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clientes-b2b/${profileId}`);
}

export async function eliminarDireccion(id: string, profileId: string) {
  await requireStaff();
  const supabase = createAdminClient();

  const { error } = await (supabase as any)
    .from("direcciones_entrega")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clientes-b2b/${profileId}`);
}

export async function setPrincipalDireccion(id: string, profileId: string) {
  await requireStaff();
  const supabase = createAdminClient();

  await (supabase as any)
    .from("direcciones_entrega")
    .update({ es_principal: false })
    .eq("profile_id", profileId);

  const { error } = await (supabase as any)
    .from("direcciones_entrega")
    .update({ es_principal: true })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clientes-b2b/${profileId}`);
}
