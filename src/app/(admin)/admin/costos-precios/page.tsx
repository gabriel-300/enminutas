import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import { armarRecetaMap } from "@/lib/receta-costos";

export const metadata: Metadata = { title: "Costos vs precios — Admin En Minutas" };
export const revalidate = 0;

const CANALES = [
  { slug: "dist",   label: "Distribuidor" },
  { slug: "gastro", label: "Gastronomía"  },
  { slug: "min",    label: "Minorista"    },
];

const fmtPeso = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

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
      .select("id, name, sku, costo, bolsas_caja, u_bolsa, pkg_unitario, pkg_bulto, categoria, divisiones_display, kg_caja, receta_producto_id")
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
      pkg_unitario:       Number(p.pkg_unitario ?? 0),
      pkg_bulto:          Number(p.pkg_bulto ?? 0),
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
          Cómo quedaría el precio de cada canal si el costo del producto fuera el costo de la receta.
          Debajo de cada precio simulado se muestra el precio de hoy.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600">Producto</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600 text-right">Costo receta / caja</th>
                {CANALES.map((c) => (
                  <th key={c.slug} className="px-5 py-3 text-xs font-semibold text-neutral-600 text-right">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filas.map((f) => (
                <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-900">{f.name}</p>
                    <p className="text-xs text-neutral-600 font-mono">{f.sku}</p>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-neutral-800">
                    {f.costoReceta !== null ? fmtPeso(f.costoReceta) : <span className="text-neutral-500">—</span>}
                  </td>
                  {CANALES.map((c) => (
                    <td key={c.slug} className="px-5 py-3 text-right tabular-nums">
                      {f.simulado ? (
                        <>
                          <p className="font-medium text-neutral-800">{fmtPeso(f.simulado[c.slug])}</p>
                          {f.actual && (
                            <p className="text-xs text-neutral-600">hoy {fmtPeso(f.actual[c.slug])}</p>
                          )}
                        </>
                      ) : <span className="text-neutral-500">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-neutral-600 mt-4 px-1">
        Precio final por caja con IVA y comisión incluidos, sin flete de zona. Misma fórmula y márgenes que la lista de precios.
        Los productos sin receta no tienen simulación.
      </p>
    </div>
  );
}
