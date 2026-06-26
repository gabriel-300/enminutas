import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";

export const metadata: Metadata = { title: "Lista de compras — Cocina En Minutas" };
export const revalidate = 0;

function fmtCant(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
}

export default async function ComprasPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawPendingOrders } = await adminClient
    .from("orders")
    .select("id")
    .in("status", ["aprobado", "enviado_prod"]);
  const pendingIds = (rawPendingOrders ?? []).map((o: any) => o.id as string);

  const [{ data: rawProducts }, { data: rawPendingLines }, { data: rawRecipes }, { data: rawIngs }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, stock_cajas, stock_minimo")
      .eq("is_active", true),

    adminClient
      .from("order_lines")
      .select("product_id, quantity")
      .in("order_id", pendingIds.length > 0 ? pendingIds : ["00000000-0000-0000-0000-000000000000"]),

    adminClient
      .from("recipes")
      .select("id, product_id, yield_cajas"),

    // Ingredientes en query separada para no crashear si 016 no fue corrida
    adminClient
      .from("recipe_ingredients")
      .select("recipe_id, nombre, cantidad, unidad, costo"),
  ]);

  // Demanda pendiente por producto
  const demandaMap: Record<string, number> = {};
  for (const line of (rawPendingLines ?? []) as any[]) {
    if (!line.product_id) continue;
    demandaMap[line.product_id] = (demandaMap[line.product_id] ?? 0) + line.quantity;
  }

  // Ingredientes por recipe_id
  const ingsByRecipe: Record<string, { nombre: string; cantidad: number; unidad: string; costo: number }[]> = {};
  for (const ing of (rawIngs ?? []) as any[]) {
    if (!ingsByRecipe[ing.recipe_id]) ingsByRecipe[ing.recipe_id] = [];
    ingsByRecipe[ing.recipe_id].push({
      nombre:   ing.nombre,
      cantidad: Number(ing.cantidad),
      unidad:   ing.unidad,
      costo:    Number(ing.costo ?? 0),
    });
  }

  // Recetas por product_id
  const recetaMap: Record<string, { id: string; yieldCajas: number; ingredients: { nombre: string; cantidad: number; unidad: string; costo: number }[] }> = {};
  for (const r of (rawRecipes ?? []) as any[]) {
    recetaMap[r.product_id] = {
      id:          r.id,
      yieldCajas:  r.yield_cajas,
      ingredients: ingsByRecipe[r.id] ?? [],
    };
  }

  type NeedItem = {
    id: string; name: string; sku: string;
    cajasNecesarias: number; yieldCajas: number; lotes: number;
    costoPorLote: number; costoPorCaja: number;
    ingredients: { nombre: string; cantidad: number; unidad: string; costo: number }[];
  };

  const needItems: NeedItem[] = [];
  const sinIngredientes: { name: string; sku: string; cajasNecesarias: number }[] = [];

  for (const p of (rawProducts ?? []) as any[]) {
    const stock   = p.stock_cajas ?? 0;
    const minimo  = p.stock_minimo ?? 0;
    const demanda = demandaMap[p.id] ?? 0;
    const cajasNecesarias = Math.max(minimo - stock, 0) + Math.max(demanda - stock, 0);
    if (cajasNecesarias <= 0) continue;

    const receta = recetaMap[p.id];
    if (!receta || receta.ingredients.length === 0) {
      sinIngredientes.push({ name: p.name, sku: p.sku, cajasNecesarias });
      continue;
    }

    const lotes = Math.ceil(cajasNecesarias / receta.yieldCajas);
    const costoPorLote = receta.ingredients.reduce((s: number, ing: { nombre: string; cantidad: number; unidad: string; costo: number }) => s + ing.costo, 0);
    const costoPorCaja = receta.yieldCajas > 0 ? costoPorLote / receta.yieldCajas : 0;
    needItems.push({
      id: p.id, name: p.name, sku: p.sku,
      cajasNecesarias, yieldCajas: receta.yieldCajas, lotes,
      costoPorLote, costoPorCaja,
      ingredients: receta.ingredients,
    });
  }

  // Consolidar ingredientes
  type IngTotal = { nombre: string; unidad: string; total: number; productos: string[] };
  const ingMap: Record<string, IngTotal> = {};
  for (const item of needItems) {
    for (const ing of item.ingredients) {
      const key = `${ing.nombre.toLowerCase()}__${ing.unidad}`;
      if (!ingMap[key]) ingMap[key] = { nombre: ing.nombre, unidad: ing.unidad, total: 0, productos: [] };
      ingMap[key].total += ing.cantidad * item.lotes;
      if (!ingMap[key].productos.includes(item.name)) ingMap[key].productos.push(item.name);
    }
  }

  const listaCompras = Object.values(ingMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const costoTotalProduccion = needItems.reduce((s, item) => s + item.costoPorLote * item.lotes, 0);
  const hayNada = needItems.length === 0 && sinIngredientes.length === 0;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin/cocina" className="text-sm text-neutral-400 hover:text-neutral-700 mb-2 inline-block">
            ← Cocina
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Lista de compras</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Ingredientes necesarios para cubrir la producción pendiente
          </p>
        </div>
        {listaCompras.length > 0 && <PrintButton />}
      </div>

      {hayNada ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay producción pendiente.</p>
          <p className="text-xs text-neutral-300 mt-1">Todo el stock está en nivel óptimo o no hay ingredientes cargados.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {listaCompras.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Comprar</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {listaCompras.length} ingrediente{listaCompras.length !== 1 ? "s" : ""} · {needItems.length} producto{needItems.length !== 1 ? "s" : ""} a producir
                  </p>
                </div>
                {costoTotalProduccion > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Costo total estimado</p>
                    <p className="text-lg font-semibold font-display text-neutral-900">
                      ${costoTotalProduccion.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400">Ingrediente</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Cantidad</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400">Se usa en</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {listaCompras.map((ing) => (
                    <tr key={`${ing.nombre}__${ing.unidad}`} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 font-medium text-neutral-900">{ing.nombre}</td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">
                        {fmtCant(ing.total)}
                        <span className="text-neutral-400 font-normal ml-1">{ing.unidad}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-400">{ing.productos.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {needItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-700">Detalle por producto</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Cajas</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Lotes</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Costo / caja</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400">Ingredientes por lote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {needItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-900">{item.name}</p>
                        <p className="text-xs text-neutral-400 font-mono">{item.sku}</p>
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-neutral-900 tabular-nums">{item.cajasNecesarias}</td>
                      <td className="px-5 py-3 text-center text-neutral-600 tabular-nums">
                        {item.lotes} × {item.yieldCajas} cj
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {item.costoPorCaja > 0
                          ? <span className="font-medium text-neutral-800">${item.costoPorCaja.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                          : <span className="text-neutral-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.ingredients.map((ing) => (
                            <span key={ing.nombre} className="px-2 py-0.5 text-xs rounded-md bg-neutral-100 text-neutral-600">
                              {ing.nombre} {fmtCant(ing.cantidad)}{ing.unidad}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sinIngredientes.length > 0 && (
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Sin ingredientes en receta</p>
              <p className="text-xs text-neutral-500 mb-3">
                Necesitan producción pero sus recetas no tienen ingredientes cargados — no se incluyen en la lista de compras.
              </p>
              <div className="flex flex-wrap gap-2">
                {sinIngredientes.map((p) => (
                  <Link key={p.sku} href="/admin/cocina/recetas"
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white !text-neutral-700 hover:border-tierra-700 hover:!text-tierra-700 transition-colors">
                    {p.name} ({p.cajasNecesarias} cajas)
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
