import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientesBb2Client } from "@/components/admin/clientes-b2b-client";

type Zona = { id: string; name: string };

export const metadata: Metadata = { title: "Clientes B2B — Admin En Minutas" };
export const revalidate = 0;

export default async function AdminClientesBb2Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const [
    { data: { users } },
    { data: zonasRaw },
    { data: canalesRaw },
  ] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    (adminClient as any).from("delivery_zones").select("id, name").order("name"),
    (adminClient as any).from("canales").select("id, slug, nombre, descuento_pct").eq("activo", true).order("sort_order"),
  ]);

  // Vendedores disponibles para asignar
  const vendedores = (users ?? [])
    .filter((u) => u.app_metadata?.role === "vendedor")
    .map((u) => ({ id: u.id, full_name: u.user_metadata?.full_name ?? u.email ?? u.id }));

  const zonas: Zona[] = (zonasRaw ?? []) as Zona[];
  const esVendedor = user.app_metadata?.role === "vendedor";

  // Filtrar clientes B2B por app_metadata (la columna role no existe en profiles)
  const b2bUsers = (users ?? []).filter(
    (u) => u.app_metadata?.role === "customer_b2b"
  );
  const b2bIds = b2bUsers.map((u) => u.id);

  const emailMap: Record<string, string | null> = Object.fromEntries(
    b2bUsers.map((u) => [u.id, u.email ?? null])
  );

  const canales = (canalesRaw ?? []) as { id: string; slug: string; nombre: string; descuento_pct: number }[];
  const canalMap: Record<string, string> = Object.fromEntries(canales.map((c) => [c.id, c.nombre]));

  const { data: perfiles } = b2bIds.length > 0
    ? await (adminClient as any)
        .from("profiles")
        .select(`id, full_name, canal_id, descuento_extra_pct, b2b_status, created_at, phone, document_number, zona_id, vendedor_id, notas_internas, direccion_calle, direccion_numero, direccion_piso, direccion_ciudad, zona:delivery_zones!zona_id (id, name)`)
        .in("id", b2bIds)
        .order("b2b_status")
        .order("created_at", { ascending: false })
    : { data: [] };

  // Incluir clientes que tienen auth pero no perfil aún
  const profileMap: Record<string, any> = Object.fromEntries(
    (perfiles ?? []).map((p: any) => [p.id, p])
  );

  // Vendedor solo ve sus clientes asignados
  const b2bUsersFiltrados = esVendedor
    ? b2bUsers.filter((u) => profileMap[u.id]?.vendedor_id === user.id)
    : b2bUsers;

  const lista = b2bUsersFiltrados.map((u) => {
    const p = profileMap[u.id];
    return {
      id:              u.id,
      full_name:       p?.full_name ?? null,
      email:           emailMap[u.id] ?? null,
      canal_id:        p?.canal_id ?? null,
      canal_nombre:    p?.canal_id ? (canalMap[p.canal_id] ?? null) : null,
      descuento_extra_pct: p?.descuento_extra_pct ?? 0,
      b2b_status:      p?.b2b_status ?? "pendiente",
      created_at:      p?.created_at ?? u.created_at,
      phone:           p?.phone ?? null,
      document_number: p?.document_number ?? null,
      zona_id:           p?.zona_id ?? null,
      zona:              p?.zona ?? null,
      vendedor_id:       p?.vendedor_id ?? null,
      notas_internas:    p?.notas_internas ?? null,
      direccion_calle:   p?.direccion_calle ?? null,
      direccion_numero:  p?.direccion_numero ?? null,
      direccion_piso:    p?.direccion_piso ?? null,
      direccion_ciudad:  p?.direccion_ciudad ?? null,
    };
  }).sort((a, b) => {
    if (a.b2b_status !== b.b2b_status) return a.b2b_status.localeCompare(b.b2b_status);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const pendingCount = lista.filter((c) => c.b2b_status === "pendiente").length;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Clientes B2B</h1>
        <p className="text-sm text-neutral-500 mt-1">{lista.length} cliente{lista.length !== 1 ? "s" : ""} registrado{lista.length !== 1 ? "s" : ""}</p>
      </div>

      <ClientesBb2Client clientes={lista} pendingCount={pendingCount} zonas={zonas} canales={canales} vendedores={vendedores} esAdmin={!esVendedor} />
    </div>
  );
}
