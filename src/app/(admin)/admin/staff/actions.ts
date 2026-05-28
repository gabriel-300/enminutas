"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_ROLES = ["admin", "vendedor", "produccion", "distribucion"] as const;
type StaffRole = typeof VALID_ROLES[number];

function isValidRole(r: unknown): r is StaffRole {
  return typeof r === "string" && (VALID_ROLES as readonly string[]).includes(r);
}

export async function cambiarRolStaff(userId: string, newRole: StaffRole) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: newRole },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}

export async function revocarAccesoStaff(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: null },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}

export async function invitarStaff(formData: FormData) {
  const email = (formData.get("email") as string).trim().toLowerCase();
  const rol   = formData.get("rol") as string;
  const name  = (formData.get("name") as string | null)?.trim() ?? "";

  if (!email) throw new Error("El email es requerido");
  if (!isValidRole(rol)) throw new Error("Rol inválido");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data:       { full_name: name || email },
    redirectTo,
  });
  if (error) throw new Error(error.message);

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    data.user.id,
    { app_metadata: { role: rol } }
  );
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/admin/staff");
}

export async function resetearPasswordAdmin(userId: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8)
    throw new Error("La contraseña debe tener al menos 8 caracteres");

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}

export async function enviarEmailRecuperacion(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = createAdminClient();

  // generateLink no requiere sesión de usuario — usa service role
  const { error } = await (supabase as any).auth.admin.generateLink({
    type:       "recovery",
    email,
    options:    { redirectTo: `${appUrl}/auth/callback?next=/auth/set-password` },
  });
  if (error) throw new Error(error.message);
}

export async function crearUsuarioConPassword(formData: FormData) {
  const email    = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const rol      = formData.get("rol") as string;
  const name     = (formData.get("name") as string | null)?.trim() ?? "";

  if (!email)            throw new Error("El email es requerido");
  if (!password)         throw new Error("La contraseña es requerida");
  if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
  if (!isValidRole(rol)) throw new Error("Rol inválido");

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || email },
    app_metadata:  { role: rol },
  });
  if (error) throw new Error(error.message);

  // Crear perfil en la tabla profiles si no existe
  await (supabase as any).from("profiles").upsert({
    id:        data.user.id,
    full_name: name || email,
  });

  revalidatePath("/admin/staff");
}
