import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CatalogoB2BClient } from "@/components/b2b/catalogo-client";
import { precioParaCanal } from "@/lib/b2b-pricing";

export const metadata: Metadata = { title: "Catálogo — Portal B2B En Minutas" };
export const revalidate = 0;

export default async function CatalogoB2BPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await (supabase as any)
    .from("profiles")
    .select("full_name, descuento_extra_pct, b2b_status, zona_id, canal:canales!canal_id (nombre, descuento_pct), zona:delivery_zones!zona_id (name, flete_kg)")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as any;
  if (!profile || profile.b2b_status !== "activo") redirect("/b2b/pendiente");

  const canal = profile.canal as { nombre: string; descuento_pct: number } | null;
  const zona  = profile.zona  as { name: string; flete_kg: number | null } | null;
  const descuentoExtra = Number(profile.descuento_extra_pct ?? 0);

  const { data: rawProducts } = await (supabase as any)
    .from("products")
    .select(`
      id, name, unit_label, cover_image_url, bolsas_caja, kg_caja,
      min_quantity_b2b, precio_lista,
      category:categories!category_id (name, slug)
    `)
    .eq("is_active", true)
    .order("name");

  const products = (rawProducts ?? []).map((p: any) => ({
    id:               p.id,
    name:             p.name,
    unit_label:       p.unit_label,
    bolsas_caja:      p.bolsas_caja,
    kg_caja:          p.kg_caja,
    cover_image_url:  p.cover_image_url as string | null,
    min_quantity_b2b: p.min_quantity_b2b as number | null,
    categoria:        p.category?.name ?? "—",
    categoria_slug:   p.category?.slug ?? "",
    precio:           precioParaCanal(
      p.precio_lista ?? null,
      Number(canal?.descuento_pct ?? 0),
      descuentoExtra,
      Number(zona?.flete_kg ?? 0),
      p.kg_caja,
      p.bolsas_caja,
    ),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Catálogo</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {profile.full_name}
          {canal?.nombre && ` · ${canal.nombre}`}
          {zona?.name && ` · ${zona.name}`}
        </p>
      </div>

      <CatalogoB2BClient products={products} zonaId={profile.zona_id ?? null} />
    </div>
  );
}
