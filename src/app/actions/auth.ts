"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Reads app_metadata.role from the DB directly via admin API.
 * supabase.auth.getUser() returns JWT claims, which the custom_access_token_hook
 * overwrites with profiles.role (only B2C/B2B enum) — making staff roles appear
 * as customer_b2c. The admin API reads raw_app_meta_data, bypassing the hook.
 */
export async function obtenerRolReal(): Promise<{ role: string | null; b2bStatus: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: null, b2bStatus: null };

  const admin = createAdminClient();
  const { data: { user: adminUser } } = await (admin as any).auth.admin.getUserById(user.id);

  return {
    role: (adminUser?.app_metadata?.role as string) ?? null,
    b2bStatus: (adminUser?.app_metadata?.b2b_status as string) ?? null,
  };
}
