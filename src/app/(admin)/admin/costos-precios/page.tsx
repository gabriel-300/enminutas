import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";

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
  const [params, { data: rawCanales }, { data: rawProducts }] = await Promise.all([
    getParametros(),
    db.from("canales").select("slug, margen_std, margen_premium, markup_pvp"),
    db.from("products")
      .select("id, name, sku, costo, bolsas_caja, u_bolsa, pkg_unitario, pkg_bulto, categoria, divisiones_display")
      .eq("is_active", true)
      .eq("es_muestra", false)
      .order("name"),
  ]);

  const canales = Object.fromEntries(
    ((rawCanales ?? []) as any[]).map((c) => [c.slug, c]),
  ) as Record<string, any>;

  const filas = ((rawProducts ?? []) as any[]).map((p) => {
    const completo = p.costo && p.bolsas_caja && p.u_bolsa && p.categoria;
    const precios: Record<string, number> | null = completo
      ? Object.fromEntries(CANALES.map((c) => [c.slug, calcularPrecio({
          costo:              Number(p.costo),
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
        }).final_civa]))
      : null;
    return {
      id: p.id as string,
      name: p.name as string,
      sku: p.sku as string,
      costoCaja: completo ? Number(p.costo) * Number(p.bolsas_caja) : null,
      precios,
    };
  });

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Costos vs precios</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Costo de cada producto por caja frente al precio final que paga cada canal.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600">Producto</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-600 text-right">Costo / caja</th>
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
                    {f.costoCaja !== null ? fmtPeso(f.costoCaja) : <span className="text-neutral-500">—</span>}
                  </td>
                  {CANALES.map((c) => (
                    <td key={c.slug} className="px-5 py-3 text-right tabular-nums font-medium text-neutral-800">
                      {f.precios ? fmtPeso(f.precios[c.slug]) : <span className="text-neutral-500 font-normal">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-neutral-600 mt-4 px-1">
        Precio final por caja con IVA y comisión incluidos, sin flete de zona. El costo es el guardado en el producto,
        el mismo que se usa para calcular la lista de precios.
      </p>
    </div>
  );
}
