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
    { data: clientes, error },
    { data: { users } },
    { data: zonasRaw },
  ] = await Promise.all([
    (adminClient as any)
      .from("profiles")
      .select(`
        id, full_name, canal, b2b_status, created_at,
        zona:delivery_zones!zona_id (name)
      `)
      .eq("role", "customer_b2b")
      .order("b2b_status")
      .order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    (adminClient as any).from("delivery_zones").select("id, name").order("name"),
  ]);

  const zonas: Zona[] = (zonasRaw ?? []) as Zona[];

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar clientes: {error.message}
      </div>
    );
  }

  const emailMap: Record<string, string | null> = Object.fromEntries(
    (users ?? []).map((u) => [u.id, u.email ?? null])
  );

  const lista = (clientes ?? []).map((c: any) => ({
    ...c,
    email: emailMap[c.id] ?? null,
  }));

  const pendingCount = lista.filter((c) => c.b2b_status === "pendiente").length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Clientes B2B</h1>
        <p className="text-sm text-neutral-500 mt-1">{lista.length} cliente{lista.length !== 1 ? "s" : ""} registrado{lista.length !== 1 ? "s" : ""}</p>
      </div>

      <ClientesBb2Client clientes={lista} pendingCount={pendingCount} zonas={zonas} />
    </div>
  );
}
