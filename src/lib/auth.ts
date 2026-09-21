import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "vendedor" | "produccion" | "distribucion";

// Las Server Actions son alcanzables por POST directo: el chequeo de página o
// middleware NO las cubre. Cada action debe llamar a requireRole() por su cuenta.
// getUser() consulta el servidor de auth, así que app_metadata.role es el real
// (no el claim del JWT, que el hook pisa con profiles.role).
export async function requireRole(...roles: StaffRole[]): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role as string | undefined;
  if (!user || !role || !(roles as string[]).includes(role)) {
    throw new Error("No autorizado");
  }
  return user;
}

export function requireAdmin() {
  return requireRole("admin");
}
