"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailClienteAprobado } from "@/lib/email";

export async function crearClienteB2B(formData: FormData) {
  const email    = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const name     = (formData.get("name") as string | null)?.trim() ?? "";
  const canal    = formData.get("canal") as string;
  const zonaId   = (formData.get("zona_id") as string | null)?.trim() || null;
  const phone    = (formData.get("phone") as string | null)?.trim() || null;
  const cuit     = (formData.get("cuit") as string | null)?.trim() || null;

  if (!email)               throw new Error("El email es requerido");
  if (!password || password.length < 8)
    throw new Error("La contraseña debe tener al menos 8 caracteres");

  const auth = await createClient();
  const { data: { user: caller } } = await auth.auth.getUser();
  const callerRole = caller?.app_metadata?.role as string | undefined;
  const autoVendedorId = callerRole === "vendedor" ? caller!.id : null;

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
    id:              data.user.id,
    full_name:       name || email,
    role:            "customer_b2b",
    canal:           canal || null,
    zona_id:         zonaId,
    b2b_status:      "activo",
    phone:           phone,
    document_type:   cuit ? "cuit" : null,
    document_number: cuit || null,
    vendedor_id:     autoVendedorId,
  });

  revalidatePath("/admin/clientes-b2b");
}

export async function invitarClienteB2B(formData: FormData) {
  const email  = (formData.get("email") as string).trim().toLowerCase();
  const name   = (formData.get("name") as string | null)?.trim() ?? "";
  const canal  = formData.get("canal") as string;
  const zonaId = (formData.get("zona_id") as string | null)?.trim() || null;
  const phone  = (formData.get("phone") as string | null)?.trim() || null;
  const cuit   = (formData.get("cuit") as string | null)?.trim() || null;

  if (!email) throw new Error("El email es requerido");

  const auth = await createClient();
  const { data: { user: caller } } = await auth.auth.getUser();
  const callerRole = caller?.app_metadata?.role as string | undefined;
  const autoVendedorId = callerRole === "vendedor" ? caller!.id : null;

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
    id:              data.user.id,
    full_name:       name || email,
    role:            "customer_b2b",
    canal:           canal || null,
    zona_id:         zonaId,
    b2b_status:      "activo",
    phone:           phone,
    document_type:   cuit ? "cuit" : null,
    document_number: cuit || null,
    vendedor_id:     autoVendedorId,
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
  const id          = formData.get("id") as string;
  const name        = (formData.get("name") as string).trim();
  const canal       = formData.get("canal") as string;
  const zonaId      = (formData.get("zona_id") as string | null)?.trim() || null;
  const phone       = (formData.get("phone") as string | null)?.trim() || null;
  const cuit        = (formData.get("cuit") as string | null)?.trim() || null;
  const vendedorId    = (formData.get("vendedor_id") as string | null)?.trim() || null;
  const notasInternas = (formData.get("notas_internas") as string | null)?.trim() || null;

  if (!id) throw new Error("ID requerido");

  const auth = await createClient();
  const { data: { user: caller } } = await auth.auth.getUser();
  const esAdmin = caller?.app_metadata?.role === "admin";

  const supabase = createAdminClient();
  const update: Record<string, any> = {
    full_name:       name || null,
    canal:           canal || null,
    zona_id:         zonaId,
    phone:           phone,
    document_type:   cuit ? "cuit" : null,
    document_number: cuit || null,
    notas_internas:  notasInternas,
  };
  // Solo el admin puede reasignar el vendedor
  if (esAdmin) update.vendedor_id = vendedorId;

  const { error } = await (supabase as any).from("profiles").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes-b2b");
  revalidatePath("/admin/preventista");
}

export async function eliminarClienteB2B(clientId: string) {
  const supabase = createAdminClient();

  // Primero borrar pedidos y líneas si existen (o dejar que cascade lo haga)
  await (supabase as any).from("profiles").delete().eq("id", clientId);
  const { error } = await supabase.auth.admin.deleteUser(clientId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes-b2b");
}
