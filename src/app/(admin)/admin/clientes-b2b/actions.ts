"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailClienteAprobado } from "@/lib/email";

export async function crearClienteB2B(formData: FormData) {
  const email    = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const name     = (formData.get("name") as string | null)?.trim() ?? "";
  const canal    = formData.get("canal") as string;
  const zonaId   = (formData.get("zona_id") as string | null)?.trim() || null;

  if (!email)               throw new Error("El email es requerido");
  if (!password || password.length < 8)
    throw new Error("La contraseña debe tener al menos 8 caracteres");

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || email },
    app_metadata:  { role: "customer_b2b" },
  });
  if (error) throw new Error(error.message);

  await (supabase as any).from("profiles").upsert({
    id:         data.user.id,
    full_name:  name || email,
    canal:      canal || null,
    zona_id:    zonaId,
    b2b_status: "activo",
  });

  revalidatePath("/admin/clientes-b2b");
}

export async function invitarClienteB2B(formData: FormData) {
  const email  = (formData.get("email") as string).trim().toLowerCase();
  const name   = (formData.get("name") as string | null)?.trim() ?? "";
  const canal  = formData.get("canal") as string;
  const zonaId = (formData.get("zona_id") as string | null)?.trim() || null;

  if (!email) throw new Error("El email es requerido");

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name || email },
    redirectTo,
  });
  if (error) throw new Error(error.message);

  await supabase.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role: "customer_b2b" },
  });

  await (supabase as any).from("profiles").upsert({
    id:         data.user.id,
    full_name:  name || email,
    canal:      canal || null,
    zona_id:    zonaId,
    b2b_status: "activo",
  });

  revalidatePath("/admin/clientes-b2b");
}

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

export async function editarClienteB2B(formData: FormData) {
  const id      = formData.get("id") as string;
  const name    = (formData.get("name") as string).trim();
  const canal   = formData.get("canal") as string;
  const zonaId  = (formData.get("zona_id") as string | null)?.trim() || null;

  if (!id) throw new Error("ID requerido");

  const supabase = createAdminClient();
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ full_name: name || null, canal: canal || null, zona_id: zonaId })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes-b2b");
}

export async function eliminarClienteB2B(clientId: string) {
  const supabase = createAdminClient();

  // Primero borrar pedidos y líneas si existen (o dejar que cascade lo haga)
  await (supabase as any).from("profiles").delete().eq("id", clientId);
  const { error } = await supabase.auth.admin.deleteUser(clientId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes-b2b");
}
