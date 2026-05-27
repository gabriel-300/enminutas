import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CatalogoB2BClient } from "@/components/b2b/catalogo-client";

export const metadata: Metadata = { title: "Catálogo — Portal B2B En Minutas" };
export const revalidate = 0;

const CANAL_LABEL: Record<string, string> = {
  dist:   "Distribuidor",
  gastro: "Gastronomía",
  min:    "Minorista",
};

type PrecioB2B = {
  lista_siva: number;
  comision:   number;
  flete:      number;
  total_siva: number;
  total_civa: number;
};

function calcPrecio(
  costo:        number | null,
  kg_caja:      number | null,
  bolsas_caja:  number | null,
  pkg_unitario: number | null,
  pkg_bulto:    number | null,
  mult_bolsas:  boolean | null,
  margen:       number,
  flete_kg:     number,
): PrecioB2B | null {
  if (!costo || !kg_caja || !bolsas_caja) return null;

  const pkg_u = pkg_unitario ?? 0;
  const pkg_b = pkg_bulto ?? 0;
  const mult  = mult_bolsas ?? true;

  const lista_siva = mult
    ? (costo * bolsas_caja) / (1 - margen) + pkg_u * bolsas_caja + pkg_b
    : costo / (1 - margen) + pkg_u + pkg_b;

  const comision   = lista_siva * 0.15;
  const flete      = kg_caja * flete_kg;
  const total_siva = lista_siva + comision + flete;
  const total_civa = total_siva * 1.21;

  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    lista_siva: r(lista_siva),
    comision:   r(comision),
    flete:      r(flete),
    total_siva: r(total_siva),
    total_civa: r(total_civa),
  };
}

export default async function CatalogoB2BPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name, canal, b2b_status, zona:delivery_zones!zona_id (flete_kg, name)")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as any;
  if (!profile || profile.b2b_status !== "activo") redirect("/pendiente");

  const canal    = profile.canal as "dist" | "gastro" | "min" | null;
  const zona     = profile.zona as { flete_kg: number | null; name: string } | null;
  const flete_kg = zona?.flete_kg ?? 0;

  const { data: rawProducts } = await supabase
    .from("products")
    .select(`
      id, name, unit_label, cover_image_url, bolsas_caja, kg_caja,
      costo, pkg_unitario, pkg_bulto, mult_bolsas,
      margen_dist, margen_gastro, margen_min,
      category:categories!category_id (name, slug)
    `)
    .eq("is_active", true)
    .order("name");

  const products = (rawProducts ?? []).map((p) => {
    const margen =
      canal === "dist"   ? (p.margen_dist   ?? 0.35) :
      canal === "gastro" ? (p.margen_gastro ?? 0.40) :
                           (p.margen_min    ?? 0.45);
    return {
      id:              p.id,
      name:            p.name,
      unit_label:      p.unit_label,
      bolsas_caja:     p.bolsas_caja,
      kg_caja:         p.kg_caja,
      categoria:       (p.category as any)?.name ?? "—",
      categoria_slug:  (p.category as any)?.slug ?? "",
      precio:          calcPrecio(
        p.costo, p.kg_caja, p.bolsas_caja,
        p.pkg_unitario, p.pkg_bulto, p.mult_bolsas,
        margen, flete_kg,
      ),
    };
  });

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
        {flete_kg > 0 && (
          <p className="text-xs text-neutral-400">
            Flete: ${new Intl.NumberFormat("es-AR").format(flete_kg)}/kg
          </p>
        )}
      </div>

      <CatalogoB2BClient products={products} />
    </div>
  );
}
