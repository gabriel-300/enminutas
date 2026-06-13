"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
}

export async function crearCanal(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const slug           = (formData.get("slug") as string).trim().toLowerCase();
  const nombre         = (formData.get("nombre") as string).trim();
  const descuento_pct  = Number(formData.get("descuento_pct")) || 0;
  const sort_order     = Number(formData.get("sort_order")) || 0;
  const margen_std     = Number(formData.get("margen_std")) / 100 || 0;
  const margen_premium = Number(formData.get("margen_premium")) / 100 || 0;
  const markup_pvp     = Number(formData.get("markup_pvp")) / 100 || 0.80;

  if (!slug || !nombre) throw new Error("Slug y nombre son requeridos");

  const { error } = await (supabase as any).from("canales").insert({
    slug, nombre, descuento_pct, sort_order, activo: true,
    margen_std, margen_premium, markup_pvp,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/canales");
  redirect("/admin/canales");
}

export async function actualizarCanal(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const nombre         = (formData.get("nombre") as string).trim();
  const descuento_pct  = Number(formData.get("descuento_pct")) || 0;
  const sort_order     = Number(formData.get("sort_order")) || 0;
  const activo         = formData.get("activo") === "on";
  const margen_std     = Number(formData.get("margen_std")) / 100 || 0;
  const margen_premium = Number(formData.get("margen_premium")) / 100 || 0;
  const markup_pvp     = Number(formData.get("markup_pvp")) / 100 || 0.80;

  const { error } = await (supabase as any)
    .from("canales")
    .update({ nombre, descuento_pct, sort_order, activo, margen_std, margen_premium, markup_pvp })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/canales");
  redirect("/admin/canales");
}

export async function eliminarCanal(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Verificar que no tenga clientes asignados
  const { count } = await (supabase as any)
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("canal_id", id);

  if (count && count > 0) {
    throw new Error(`No se puede eliminar: hay ${count} cliente(s) asignados a este canal.`);
  }

  const { error } = await supabase.from("canales").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/canales");
}
