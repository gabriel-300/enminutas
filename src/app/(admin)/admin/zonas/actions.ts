"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
}

export async function crearZona(formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name") as string).trim();
  const flete   = Number(formData.get("flete_kg")) || null;
  if (!name) throw new Error("El nombre es requerido");

  const supabase = createAdminClient();
  const db = supabase as any;
  const { error } = await db.from("delivery_zones").insert({
    name,
    flete_kg: flete,
    polygon: { type: "Point", coordinates: [] },
    base_fee: 0,
    estimated_minutes: 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zonas");
}

export async function actualizarZona(id: string, formData: FormData) {
  await requireAdmin();
  const name  = (formData.get("name") as string).trim();
  const flete = Number(formData.get("flete_kg")) || null;
  if (!name) throw new Error("El nombre es requerido");

  const supabase = createAdminClient();
  const db = supabase as any;
  const { error } = await db.from("delivery_zones").update({ name, flete_kg: flete }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zonas");
}

export async function eliminarZona(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const db = supabase as any;

  // Verificar que no haya pedidos activos ni clientes asignados a esta zona
  const [{ count: pedidosActivos }, { count: clientesAsignados }] = await Promise.all([
    db.from("orders")
      .select("*", { count: "exact", head: true })
      .eq("delivery_zone_id", id)
      .in("status", ["aprobado", "enviado_prod", "despachado", "en_distribucion"]),
    db.from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("zona_id", id),
  ]);

  if ((pedidosActivos ?? 0) > 0)
    throw new Error(`No se puede eliminar: hay ${pedidosActivos} pedido${pedidosActivos !== 1 ? "s" : ""} activo${pedidosActivos !== 1 ? "s" : ""} en esta zona`);
  if ((clientesAsignados ?? 0) > 0)
    throw new Error(`No se puede eliminar: hay ${clientesAsignados} cliente${clientesAsignados !== 1 ? "s" : ""} asignado${clientesAsignados !== 1 ? "s" : ""} a esta zona`);

  const { error } = await db.from("delivery_zones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zonas");
}
