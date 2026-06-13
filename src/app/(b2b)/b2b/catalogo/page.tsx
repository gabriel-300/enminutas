import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CatalogoB2BClient } from "@/components/b2b/catalogo-client";
import { calcularPrecio } from "@/lib/b2b-pricing";

export const metadata: Metadata = { title: "Catálogo — Portal B2B En Minutas" };
export const revalidate = 0;

export default async function CatalogoB2BPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await (supabase as any)
    .from("profiles")
    .select(`
      full_name, b2b_status, zona_id,
      canal:canales!canal_id (nombre, slug, margen_std, margen_premium, markup_pvp),
      zona:delivery_zones!zona_id (name, km, precio_km)
    `)
    .eq("id", user.id)
    .single();

  const profile = profileRaw as any;
  if (!profile || profile.b2b_status !== "activo") redirect("/b2b/pendiente");

  const canal = profile.canal as {
    nombre: string; slug: string;
    margen_std: number; margen_premium: number; markup_pvp: number;
  } | null;

  const zona = profile.zona as { name: string; km: number; precio_km: number } | null;

  // Líneas actualmente disponibles
  const { data: lineasDisp } = await (supabase as any)
    .from("disponibilidad_lineas")
    .select("linea_id")
    .eq("disponible", true);

  const lineasIds: number[] = (lineasDisp ?? []).map((l: any) => l.linea_id);

  const { data: rawProducts } = await (supabase as any)
    .from("products")
    .select(`
      id, name, unit_label, cover_image_url, min_quantity_b2b,
      codigo, presentacion, u_bolsa, bolsas_caja, kg_caja,
      costo, pkg_unitario, pkg_bulto,
      categoria, divisiones_display, linea_id,
      linea:lineas_producto!linea_id (nombre, orden)
    `)
    .eq("is_active", true)
    .in("linea_id", lineasIds.length > 0 ? lineasIds : [0])
    .order("codigo");

  const products = (rawProducts ?? [])
    .filter((p: any) => p.costo && p.bolsas_caja && p.u_bolsa && p.categoria && canal)
    .map((p: any) => ({
      id:               p.id,
      name:             p.name,
      codigo:           p.codigo,
      presentacion:     p.presentacion ?? p.unit_label,
      unit_label:       p.unit_label,
      bolsas_caja:      p.bolsas_caja,
      cover_image_url:  p.cover_image_url as string | null,
      min_quantity_b2b: p.min_quantity_b2b as number | null,
      linea:            (p.linea as any)?.nombre ?? "",
      precio: calcularPrecio({
        costo:              Number(p.costo),
        bolsas_caja:        Number(p.bolsas_caja),
        pkg_unitario:       Number(p.pkg_unitario ?? 0),
        pkg_bulto:          Number(p.pkg_bulto ?? 0),
        u_bolsa:            Number(p.u_bolsa),
        categoria:          p.categoria,
        divisiones_display: p.divisiones_display ?? null,
        margen_std:         Number(canal!.margen_std),
        margen_premium:     Number(canal!.margen_premium),
        markup_pvp:         Number(canal!.markup_pvp),
        km:                 Number(zona?.km ?? 0),
        precio_km:          Number(zona?.precio_km ?? 0),
      }),
    }));

  const costoViaje = zona ? zona.km * 2 * zona.precio_km : 0;

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

      <CatalogoB2BClient
        products={products}
        zonaId={profile.zona_id ?? null}
        costoViaje={costoViaje}
      />
    </div>
  );
}
