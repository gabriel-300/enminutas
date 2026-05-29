import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Recetas — Admin En Minutas" };
export const revalidate = 0;

export default async function RecetasPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rawProducts }, { data: rawRecipes }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, category:categories!category_id (name)")
      .eq("is_active", true)
      .order("name"),

    adminClient
      .from("recipes")
      .select("id, product_id, yield_cajas, steps:recipe_steps (id, minutes), ingredients:recipe_ingredients (costo)"),
  ]);

  const recipeMap: Record<string, { yieldCajas: number; totalMinutos: number; pasos: number; costoCaja: number }> = {};
  for (const r of (rawRecipes ?? []) as any[]) {
    const totalMinutos = (r.steps ?? []).reduce((s: number, st: any) => s + Number(st.minutes), 0);
    const costoLote    = (r.ingredients ?? []).reduce((s: number, ing: any) => s + Number(ing.costo ?? 0), 0);
    const costoCaja    = r.yield_cajas > 0 ? costoLote / r.yield_cajas : 0;
    recipeMap[r.product_id] = { yieldCajas: r.yield_cajas, totalMinutos, pasos: r.steps?.length ?? 0, costoCaja };
  }

  const products = (rawProducts ?? []) as any[];
  const conReceta    = products.filter((p) => recipeMap[p.id]);
  const sinReceta    = products.filter((p) => !recipeMap[p.id]);

  function fmtMin(min: number) {
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin/cocina" className="text-sm text-neutral-400 hover:text-neutral-700 mb-2 inline-block">
            ← Cocina
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Recetas de producción</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {conReceta.length} de {products.length} productos con receta cargada
          </p>
        </div>
      </div>

      {sinReceta.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-warning-bg border border-warning/30 rounded-xl text-sm text-warning font-medium">
          {sinReceta.length} producto{sinReceta.length !== 1 ? "s" : ""} sin receta — el planificador no puede estimar tiempos para ellos
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">Con receta ({conReceta.length})</p>
        </div>
        {conReceta.length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-400 text-center">Todavía no hay recetas cargadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Lote estándar</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Pasos</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Tiempo total</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Costo / caja</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {conReceta.map((p) => {
                const r = recipeMap[p.id];
                return (
                  <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-900">{p.name}</p>
                      <p className="text-xs text-neutral-400 font-mono">{p.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-center text-sm text-neutral-600">{r.yieldCajas} caja{r.yieldCajas !== 1 ? "s" : ""}</td>
                    <td className="px-5 py-3 text-center text-sm text-neutral-600">{r.pasos}</td>
                    <td className="px-5 py-3 text-center text-sm font-medium text-neutral-800">{fmtMin(r.totalMinutos)}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">
                      {r.costoCaja > 0
                        ? <span className="font-medium text-neutral-800">${r.costoCaja.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                        : <span className="text-neutral-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/cocina/recetas/${p.id}`} className="text-xs text-tierra-700 hover:underline font-medium">
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700">Sin receta ({sinReceta.length})</p>
        </div>
        {sinReceta.length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-400 text-center">¡Todos los productos tienen receta!</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-50">
              {sinReceta.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-900">{p.name}</p>
                    <p className="text-xs text-neutral-400 font-mono">{p.sku}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/cocina/recetas/${p.id}`} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 !text-white hover:bg-tierra-800 transition-colors">
                      + Cargar receta
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
