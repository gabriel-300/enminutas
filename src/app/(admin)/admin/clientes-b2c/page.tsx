import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientesB2CClient } from "@/components/admin/clientes-b2c-client";

export const metadata: Metadata = { title: "Clientes B2C — Admin En Minutas" };
export const revalidate = 0;

export default async function ClientesB2CPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Traer usuarios sin rol de staff ni B2B (clientes B2C)
  const { data: authUsers } = await (await import("@/lib/supabase/server"))
    .createAdminClient()
    .auth.admin.listUsers({ perPage: 200 });

  const clientes = (authUsers?.users ?? [])
    .filter((u) => {
      const role = u.app_metadata?.role;
      return !role || role === "customer_b2c";
    })
    .map((u) => ({
      id:           u.id,
      email:        u.email ?? "",
      name:         (u.user_metadata?.full_name as string | null) ?? null,
      phone:        (u.user_metadata?.phone as string | null) ?? null,
      created_at:   u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      confirmed:    !!u.email_confirmed_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Clientes B2C</h1>
        <p className="text-sm text-neutral-500 mt-1">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrados</p>
      </div>
      <ClientesB2CClient clientes={clientes} />
    </div>
  );
}
