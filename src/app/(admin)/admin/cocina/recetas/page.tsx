import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calcularPrecio } from "@/lib/b2b-pricing";

export const metadata: Metadata = { title: "Recetas — Admin En Minutas" };
export const revalidate = 0;

function fmtPeso(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function fmtMin(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function margenCls(pct: number) {
  if (pct < 20) return "text-red-600 font-semibold";
  if (pct < 40) return "text-amber-600 font-medium";
  return "text-emerald-600 font-medium";
}

export default async function RecetasPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: rawProducts },
    { data: rawRecipes },
    { data: canalRef },
    { data: paramGlobal },
  ] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, costo, bolsas_caja, pkg_unitario, pkg_bulto, u_bolsa, divisiones_display, category:categories!category_id (name)")
      .eq("is_active", true)
      .order("name"),

    adminClient
      .from("recipes")
      .select("id, product_id, yield_cajas, steps:recipe_steps (id, minutes), ingredients:recipe_ingredients (cantidad, insumo:insumos!insumo_id (precio_unitario))"),

    adminClient
      .from("canales")
      .select("margen_std, margen_premium, markup_pvp")
      .eq("slug", "dist")
      .single(),

    adminClient
      .from("parametros_globales")
      .select("iva_pct, comision_pct")
      .single(),
  ]);

  const margen_std     = Number(canalRef?.margen_std    ?? 0.40);
  const margen_premium = Number(canalRef?.margen_premium ?? 0.45);
  const markup_pvp     = Number(canalRef?.markup_pvp    ?? 0.80);
  const iva_pct        = Number(paramGlobal?.iva_pct    ?? 0.21);
  const comision_pct   = Number(paramGlobal?.comision_pct ?? 0.15);

  const recipeMap: Record<string, {
    yieldCajas:   number;
    totalMinutos: number;
    pasos:        number;
    costoCaja:    number;
  }> = {};

  for (const r of (rawRecipes ?? []) as any[]) {
    const totalMinutos = (r.steps ?? []).reduce((s: number, st: any) => s + Number(st.minutes), 0);
    const costoLote    = (r.ingredients ?? []).reduce((s: number, ing: any) => {
      const precio = Number(ing.insumo?.precio_unitario ?? 0);
      return s + Number(ing.cantidad) * precio;
    }, 0);
    const costoCaja = r.yield_cajas > 0 ? costoLote / r.yield_cajas : 0;
    recipeMap[r.product_id] = {
      yieldCajas: r.yield_cajas,
      totalMinutos,
      pasos: r.steps?.length ?? 0,
      costoCaja,
    };
  }

  const products  = (rawProducts ?? []) as any[];
  const conReceta = products.filter((p) => recipeMap[p.id]);
  const sinReceta = products.filter((p) => !recipeMap[p.id]);

  // Compute pricing metrics per product
  const pricingMap: Record<string, { listaSiva: number; margenPct: number; desactualizado: boolean }> = {};
  for (const p of conReceta) {
    const r         = recipeMap[p.id];
    const costo     = Number(p.costo ?? 0);
    const bolsas    = Number(p.bolsas_caja ?? 0);
    if (costo <= 0 || bolsas <= 0) continue;

    const precio = calcularPrecio({
      costo,
      bolsas_caja:        bolsas,
      pkg_unitario:       Number(p.pkg_unitario ?? 0),
      pkg_bulto:          Number(p.pkg_bulto ?? 0),
      u_bolsa:            Number(p.u_bolsa ?? 1),
      categoria:          p.category?.name ?? "Estándar",
      divisiones_display: p.divisiones_display != null ? Number(p.divisiones_display) : null,
      margen_std,
      margen_premium,
      markup_pvp,
      iva_pct,
      comision_pct,
    });

    const listaSiva   = precio.lista_siva;
    const costoCajaReceta   = r.costoCaja;
    const margenPct   = listaSiva > 0 ? ((listaSiva - costoCajaReceta) / listaSiva) * 100 : 0;

    // Stored cost per caja = costo × bolsas_caja
    const costoStoredCaja = costo * bolsas;
    const desactualizado  = costoCajaReceta > 0 &&
      Math.abs(costoStoredCaja - costoCajaReceta) / costoCajaReceta > 0.02;

    pricingMap[p.id] = { listaSiva, margenPct, desactualizado };
  }

  return (
    <div className="p-8 max-w-5xl">
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
          <p className="text-xs text-neutral-400">Precios ref. canal Distribuidor</p>
        </div>
        {conReceta.length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-400 text-center">Todavía no hay recetas cargadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Lote</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Pasos</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Tiempo</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Costo / caja</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Lista s/IVA</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Margen %</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {conReceta.map((p) => {
                  const r       = recipeMap[p.id];
                  const pricing = pricingMap[p.id];
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-900">{p.name}</p>
                        <p className="text-xs text-neutral-400 font-mono">{p.sku}</p>
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-neutral-600">
                        {r.yieldCajas} caja{r.yieldCajas !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-neutral-600">{r.pasos}</td>
                      <td className="px-5 py-3 text-center text-sm font-medium text-neutral-800">
                        {fmtMin(r.totalMinutos)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums">
                        {r.costoCaja > 0
                          ? <span className="font-medium text-neutral-800">{fmtPeso(r.costoCaja)}</span>
                          : <span className="text-neutral-300">—</span>
                        }
                      </td>

                      {/* Lista s/IVA */}
                      <td className="px-5 py-3 text-right text-sm tabular-nums whitespace-nowrap">
                        {pricing ? (
                          <span className="font-medium text-neutral-800">{fmtPeso(pricing.listaSiva)}</span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>

                      {/* Margen % */}
                      <td className="px-5 py-3 text-right text-sm tabular-nums whitespace-nowrap">
                        {pricing ? (
                          <span className={margenCls(pricing.margenPct)}>
                            {pricing.margenPct.toFixed(0)}%
                            {pricing.desactualizado && (
                              <span title="El costo del producto no está sincronizado con la receta. Editá la receta y usá 'Actualizar costo del producto'."
                                className="ml-1 text-amber-500 cursor-help">⚠</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-right">
                        <Link href={`/admin/cocina/recetas/${p.id}`}
                          className="text-xs text-tierra-700 hover:underline font-medium">
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-6 text-xs text-neutral-400 px-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Margen &lt; 20% — revisar precio</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> 20–40% — aceptable</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> &gt; 40% — saludable</span>
        <span className="flex items-center gap-1.5">⚠ costo desactualizado</span>
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
                    <Link href={`/admin/cocina/recetas/${p.id}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 !text-white hover:bg-tierra-800 transition-colors">
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
