"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearClienteB2C(formData: FormData) {
  const email    = (formData.get("email") as string).trim().toLowerCase();
  const name     = (formData.get("name") as string | null)?.trim() ?? "";
  const phone    = (formData.get("phone") as string | null)?.trim() ?? "";
  const password = formData.get("password") as string;

  if (!email)              throw new Error("El email es requerido");
  if (!password)           throw new Error("La contraseña es requerida");
  if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");

  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name || email,
      phone:     phone || undefined,
    },
  });
  if (error) throw new Error(error.message);

  // Upsert en profiles
  await (supabase as any).from("profiles").upsert({
    id:        data.user.id,
    full_name: name || email,
  });

  revalidatePath("/admin/clientes-b2c");
}

export async function resetearPasswordClienteB2C(userId: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8)
    throw new Error("La contraseña debe tener al menos 8 caracteres");

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}

export async function eliminarClienteB2C(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes-b2c");
}
