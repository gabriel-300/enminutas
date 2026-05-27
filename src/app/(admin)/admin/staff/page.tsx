import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StaffClient } from "@/components/admin/staff-client";

export const metadata: Metadata = { title: "Staff — Admin En Minutas" };
export const revalidate = 0;

export default async function AdminStaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Solo admin puede ver esta página (también protegido por middleware)
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const adminClient = createAdminClient();
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar usuarios: {error.message}
      </div>
    );
  }

  // Filtrar solo staff (con role admin/vendedor/produccion en app_metadata)
  const STAFF_ROLES = ["admin", "vendedor", "produccion"];
  const staff = (users ?? [])
    .filter((u) => STAFF_ROLES.includes(u.app_metadata?.role))
    .map((u) => ({
      id:           u.id,
      email:        u.email ?? "",
      name:         (u.user_metadata?.full_name as string | null) ?? null,
      role:         u.app_metadata?.role as string,
      created_at:   u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => {
      const order = { admin: 0, vendedor: 1, produccion: 2 };
      return (order[a.role as keyof typeof order] ?? 9) - (order[b.role as keyof typeof order] ?? 9);
    });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Staff</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Usuarios con acceso al panel admin
        </p>
      </div>

      <StaffClient staff={staff} currentUserId={user.id} />
    </div>
  );
}
