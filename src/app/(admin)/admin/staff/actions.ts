"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_ROLES = ["admin", "vendedor", "produccion"] as const;
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
  // Limpiar el rol de staff del app_metadata
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

  const supabase = createAdminClient();

  // Invitar al usuario (envía email de invitación)
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name || email },
  });
  if (error) throw new Error(error.message);

  // Asignar el rol en app_metadata
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    data.user.id,
    { app_metadata: { role: rol } }
  );
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/admin/staff");
}
