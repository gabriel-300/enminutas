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
  const [
    { data: { users }, error },
    { data: zonasRaw },
  ] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    (adminClient as any).from("delivery_zones").select("id, name").order("name"),
  ]);

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar usuarios: {error.message}
      </div>
    );
  }

  const STAFF_ROLES = ["admin", "vendedor", "produccion", "distribucion"];
  const staffUsers   = (users ?? []).filter((u) => STAFF_ROLES.includes(u.app_metadata?.role));
  const distIds      = staffUsers.filter((u) => u.app_metadata?.role === "distribucion").map((u) => u.id);
  const vendedorIds  = staffUsers.filter((u) => u.app_metadata?.role === "vendedor").map((u) => u.id);
  const perfilIds    = [...new Set([...distIds, ...vendedorIds])];

  // Cargar zonas (distribuidores) y comisión (vendedores)
  const { data: perfilesRaw } = perfilIds.length > 0
    ? await (adminClient as any).from("profiles").select("id, zona_id, comision_preventista_pct").in("id", perfilIds)
    : { data: [] };

  const zonaByUser: Record<string, string | null>   = {};
  const comisionByUser: Record<string, number | null> = {};
  for (const p of (perfilesRaw ?? []) as any[]) {
    zonaByUser[p.id]    = p.zona_id ?? null;
    comisionByUser[p.id] = p.comision_preventista_pct ?? null;
  }

  const zonas = (zonasRaw ?? []) as { id: string; name: string }[];

  const staff = staffUsers
    .map((u) => ({
      id:                       u.id,
      email:                    u.email ?? "",
      name:                     (u.user_metadata?.full_name as string | null) ?? null,
      role:                     u.app_metadata?.role as string,
      created_at:               u.created_at,
      last_sign_in:             u.last_sign_in_at ?? null,
      zona_id:                  zonaByUser[u.id] ?? null,
      comision_preventista_pct: comisionByUser[u.id] ?? null,
    }))
    .sort((a, b) => {
      const order = { admin: 0, vendedor: 1, produccion: 2, distribucion: 3 };
      return (order[a.role as keyof typeof order] ?? 9) - (order[b.role as keyof typeof order] ?? 9);
    });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Staff</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Usuarios con acceso al panel admin
        </p>
      </div>

      <StaffClient staff={staff as any} currentUserId={user.id} zonas={zonas} />
    </div>
  );
}
