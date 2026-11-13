import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import { armarRecetaMap } from "@/lib/receta-costos";
import { CostosPreciosClient } from "./costos-precios-client";

export const metadata: Metadata = { title: "Costos vs precios — Admin En Minutas" };
export const revalidate = 0;

const CANALES = [
  { slug: "dist",   label: "Distribuidor" },
  { slug: "gastro", label: "Gastronomía"  },
  { slug: "min",    label: "Minorista"    },
];

export default async function CostosPreciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin");

  const db = createAdminClient() as any;
  const [params, { data: rawCanales }, { data: rawProducts }, { data: rawRecipes }, { data: todos }] = await Promise.all([
    getParametros(),
    db.from("canales").select("slug, margen_std, margen_premium, markup_pvp"),
    db.from("products")
      .select("id, name, sku, costo, bolsas_caja, u_bolsa, categoria, divisiones_display, kg_caja, receta_producto_id")
      .eq("is_active", true)
      .eq("es_muestra", false)
      .order("name"),
    db.from("recipes")
      .select("id, product_id, yield_cajas, steps:recipe_steps (id, minutes), ingredients:recipe_ingredients (cantidad, insumo:insumos!insumo_id (precio_unitario))"),
    // Incluye inactivos: el dueño de una receta compartida puede estar inactivo
    db.from("products").select("id, kg_caja"),
  ]);

  const recetaMap = armarRecetaMap(
    (rawProducts ?? []) as any[],
    (rawRecipes ?? []) as any[],
    (todos ?? []) as any[],
  );

  const canales = Object.fromEntries(
    ((rawCanales ?? []) as any[]).map((c) => [c.slug, c]),
  ) as Record<string, any>;

  // Precio final c/IVA por caja en cada canal, para un costo por bolsa dado
  const preciosConCosto = (p: any, costoBolsa: number): Record<string, number> =>
    Object.fromEntries(CANALES.map((c) => [c.slug, calcularPrecio({
      costo:              costoBolsa,
      bolsas_caja:        Number(p.bolsas_caja),
      u_bolsa:            Number(p.u_bolsa),
      categoria:          p.categoria,
      divisiones_display: p.divisiones_display ?? null,
      margen_std:         Number(canales[c.slug]?.margen_std),
      margen_premium:     Number(canales[c.slug]?.margen_premium),
      markup_pvp:         Number(canales[c.slug]?.markup_pvp),
      iva_pct:            params.iva_pct,
      comision_pct:       params.comision_pct,
    }).final_civa]));

  const filas = ((rawProducts ?? []) as any[]).map((p) => {
    const datosOk     = p.bolsas_caja && p.u_bolsa && p.categoria;
    const costoReceta = recetaMap[p.id]?.costoCaja > 0 ? recetaMap[p.id].costoCaja : null;
    return {
      id: p.id as string,
      name: p.name as string,
      sku: p.sku as string,
      costoReceta,
      // Simulado: como si el costo del producto fuera el de la receta
      simulado: datosOk && costoReceta !== null
        ? preciosConCosto(p, costoReceta / Number(p.bolsas_caja))
        : null,
      // Hoy: con el costo guardado en el producto
      actual: datosOk && p.costo ? preciosConCosto(p, Number(p.costo)) : null,
    };
  });

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Costos vs precios</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Precio por caja de cada canal: el que se cobra actualmente y el sugerido si el costo del producto
          fuera el costo real de su receta.
        </p>
      </div>

      <CostosPreciosClient filas={filas} canales={CANALES} />

      <p className="text-xs text-neutral-600 mt-4 px-1">
        Precios finales por caja con IVA y comisión incluidos, sin flete de zona, con la misma fórmula y márgenes que la lista de precios.
        "Precio actual" usa el costo cargado en el producto; "Precio sugerido" usa el costo calculado desde los insumos de la receta.
        Los productos sin receta no tienen esa simulación.
      </p>
    </div>
  );
}
