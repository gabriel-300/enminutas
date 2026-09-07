"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
}

export async function asignarZonaDistribuidor(userId: string, zonaId: string | null) {
  await requireAdmin();
  const supabase = createAdminClient();
  await (supabase as any).from("profiles").upsert({
    id:      userId,
    zona_id: zonaId || null,
  });
  revalidatePath("/admin/staff");
  revalidatePath("/admin/distribucion");
}

export async function actualizarComisionPreventista(userId: string, pct: number | null) {
  await requireAdmin();
  const supabase = createAdminClient();
  await (supabase as any).from("profiles").upsert({
    id:                       userId,
    comision_preventista_pct: pct,
  });
  revalidatePath("/admin/staff");
  revalidatePath("/admin/reportes");
  revalidatePath("/admin/preventista");
}

const VALID_ROLES = ["admin", "vendedor", "produccion", "distribucion"] as const;
type StaffRole = typeof VALID_ROLES[number];

function isValidRole(r: unknown): r is StaffRole {
  return typeof r === "string" && (VALID_ROLES as readonly string[]).includes(r);
}

export async function cambiarRolStaff(userId: string, newRole: StaffRole) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: newRole },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}

export async function revocarAccesoStaff(userId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: null },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}

export async function invitarStaff(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const email = (formData.get("email") as string).trim().toLowerCase();
  const rol   = formData.get("rol") as string;
  const name  = (formData.get("name") as string | null)?.trim() ?? "";

  if (!email) return { ok: false, error: "El email es requerido" };
  if (!isValidRole(rol)) return { ok: false, error: "Rol inválido" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data:       { full_name: name || email },
    redirectTo,
  });
  if (error) {
    const msg = error.message.includes("already been registered")
      ? `El email ${email} ya tiene una cuenta registrada. Usá "Con contraseña" para agregarle un rol directamente.`
      : error.message;
    return { ok: false, error: msg };
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    data.user.id,
    { app_metadata: { role: rol } }
  );
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function resetearPasswordAdmin(userId: string, newPassword: string) {
  await requireAdmin();
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

export async function crearUsuarioConPassword(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const email    = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const rol      = formData.get("rol") as string;
  const name     = (formData.get("name") as string | null)?.trim() ?? "";

  if (!email)               return { ok: false, error: "El email es requerido" };
  if (!password)            return { ok: false, error: "La contraseña es requerida" };
  if (password.length < 8)  return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  if (!isValidRole(rol))    return { ok: false, error: "Rol inválido" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || email },
    app_metadata:  { role: rol },
  });
  if (error) {
    const msg = error.message.includes("already been registered") || error.message.includes("already exists")
      ? `El email ${email} ya tiene una cuenta. Si es un cliente B2B, podés asignarle rol directamente desde Supabase Auth.`
      : error.message;
    return { ok: false, error: msg };
  }

  await (supabase as any).from("profiles").upsert({
    id:        data.user.id,
    full_name: name || email,
  });

  revalidatePath("/admin/staff");
  return { ok: true };
}
