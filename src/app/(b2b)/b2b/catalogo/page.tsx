import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CatalogoB2BClient } from "@/components/b2b/catalogo-client";
import { precioParaCanal } from "@/lib/b2b-pricing";

export const metadata: Metadata = { title: "Catálogo — Portal B2B En Minutas" };
export const revalidate = 0;

const CANAL_LABEL: Record<string, string> = {
  dist:   "Distribuidor",
  gastro: "Gastronomía",
  min:    "Minorista",
};

export default async function CatalogoB2BPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name, canal, b2b_status, zona:delivery_zones!zona_id (name)")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as any;
  if (!profile || profile.b2b_status !== "activo") redirect("/b2b/pendiente");

  const canal = profile.canal as "dist" | "gastro" | "min" | null;
  const zona  = profile.zona as { name: string } | null;

  const { data: rawProducts } = await supabase
    .from("products")
    .select(`
      id, name, unit_label, cover_image_url, bolsas_caja, kg_caja,
      min_quantity_b2b, precio_dist, precio_gastro, precio_min,
      category:categories!category_id (name, slug)
    `)
    .eq("is_active", true)
    .order("name");

  const products = (rawProducts ?? []).map((p) => ({
    id:               p.id,
    name:             p.name,
    unit_label:       p.unit_label,
    bolsas_caja:      p.bolsas_caja,
    kg_caja:          p.kg_caja,
    cover_image_url:  (p as any).cover_image_url as string | null,
    min_quantity_b2b: (p as any).min_quantity_b2b as number | null,
    categoria:        (p.category as any)?.name ?? "—",
    categoria_slug:   (p.category as any)?.slug ?? "",
    precio:           precioParaCanal(
      canal,
      (p as any).precio_dist   ?? null,
      (p as any).precio_gastro ?? null,
      (p as any).precio_min    ?? null,
      p.bolsas_caja,
    ),
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Catálogo</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {profile.full_name}
            {canal && ` · ${CANAL_LABEL[canal]}`}
            {zona?.name && ` · ${zona.name}`}
          </p>
        </div>
      </div>

      <CatalogoB2BClient products={products} />
    </div>
  );
}
