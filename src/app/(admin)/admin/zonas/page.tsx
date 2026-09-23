import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ZonasClient } from "@/components/admin/zonas-client";

export const metadata: Metadata = { title: "Zonas de delivery — Admin En Minutas" };
export const revalidate = 0;

export default async function AdminZonasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createAdminClient() as any;

  const [{ data: zonas, error }, { data: clienteCounts }] = await Promise.all([
    db.from("delivery_zones")
      .select("id, name, codigo, km, flete_pct, updated_at")
      .order("km", { ascending: true }),
    db.from("profiles").select("zona_id").not("zona_id", "is", null),
  ]);

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar zonas: {error.message}
      </div>
    );
  }

  const countMap: Record<string, number> = {};
  for (const p of (clienteCounts ?? [])) {
    const zid = (p as any).zona_id;
    if (zid) countMap[zid] = (countMap[zid] ?? 0) + 1;
  }

  const lista = (zonas ?? []).map((z: any) => ({
    id:           z.id,
    codigo:       z.codigo ?? "",
    name:         z.name,
    km:           z.km ?? 0,
    flete_pct:    Number(z.flete_pct ?? 0),
    client_count: countMap[z.id] ?? 0,
    updated_at:   z.updated_at ?? null,
  }));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Zonas — Fletes y destinos</h1>
        <p className="text-sm text-neutral-500 mt-1">
          El flete va incluido en el precio de la mercadería: un % sobre el precio de lista s/IVA de cada zona. 0% = sin flete.
        </p>
      </div>
      <ZonasClient zonas={lista} />
    </div>
  );
}
