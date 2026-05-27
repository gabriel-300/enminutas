"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailClienteAprobado } from "@/lib/email";

export async function aprobarCliente(profileId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ b2b_status: "activo" })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  // Notificar al cliente — fire and forget
  const { data: authUser } = await supabase.auth.admin.getUserById(profileId);
  const { data: profile }  = await supabase.from("profiles").select("full_name").eq("id", profileId).single();
  if (authUser?.user?.email) {
    emailClienteAprobado({
      clientEmail: authUser.user.email,
      clientName:  (profile?.full_name as string | null) ?? authUser.user.email,
    }).catch(() => {});
  }

  revalidatePath("/admin/clientes-b2b");
}

export async function rechazarCliente(profileId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ b2b_status: "inactivo" })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes-b2b");
}

export async function cambiarEstadoCliente(profileId: string, status: "pendiente" | "activo" | "inactivo") {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ b2b_status: status })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes-b2b");
}
