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

function fmtPeso(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
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

  const [
    { data: rawProducts },
    { data: rawPendingLines },
    { data: rawRecipes },
    { data: rawIngs },
    { data: rawLotes },
    { data: rawInsumos },
  ] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, stock_minimo")
      .eq("is_active", true),

    adminClient
      .from("order_lines")
      .select("product_id, quantity")
      .in("order_id", pendingIds.length > 0 ? pendingIds : ["00000000-0000-0000-0000-000000000000"]),

    adminClient
      .from("recipes")
      .select("id, product_id, yield_cajas"),

    adminClient
      .from("recipe_ingredients")
      .select("recipe_id, insumo_id, cantidad, insumo:insumos!insumo_id(nombre, unidad, precio_unitario)"),

    // Stock real de productos terminados
    adminClient
      .from("lotes")
      .select("producto_id, cantidad_actual")
      .eq("activo", true),

    // Stock real de insumos con punto de pedido
    adminClient
      .from("insumos")
      .select("id, nombre, unidad, stock_actual, stock_minimo, punto_pedido, precio_unitario")
      .order("nombre"),
  ]);

  // Stock real de productos terminados (suma de lotes activos)
  const stockProdMap: Record<string, number> = {};
  for (const lote of (rawLotes ?? []) as any[]) {
    if (!lote.producto_id) continue;
    stockProdMap[lote.producto_id] = (stockProdMap[lote.producto_id] ?? 0) + Number(lote.cantidad_actual);
  }

  // Stock de insumos indexado por id
  const insumoStockMap: Record<string, { stockActual: number; puntoPedido: number; stockMinimo: number; precio: number; unidad: string; nombre: string }> = {};
  for (const ins of (rawInsumos ?? []) as any[]) {
    insumoStockMap[ins.id] = {
      stockActual: Number(ins.stock_actual ?? 0),
      puntoPedido: Number(ins.punto_pedido ?? 0),
      stockMinimo: Number(ins.stock_minimo ?? 0),
      precio:      Number(ins.precio_unitario ?? 0),
      unidad:      ins.unidad,
      nombre:      ins.nombre,
    };
  }

  // Demanda pendiente por producto
  const demandaMap: Record<string, number> = {};
  for (const line of (rawPendingLines ?? []) as any[]) {
    if (!line.product_id) continue;
    demandaMap[line.product_id] = (demandaMap[line.product_id] ?? 0) + line.quantity;
  }

  // Ingredientes por recipe_id
  const ingsByRecipe: Record<string, { insumo_id: string; nombre: string; cantidad: number; unidad: string; precio: number }[]> = {};
  for (const ing of (rawIngs ?? []) as any[]) {
    if (!ing.insumo_id || !ing.insumo) continue;
    if (!ingsByRecipe[ing.recipe_id]) ingsByRecipe[ing.recipe_id] = [];
    ingsByRecipe[ing.recipe_id].push({
      insumo_id: ing.insumo_id,
      nombre:    ing.insumo.nombre,
      cantidad:  Number(ing.cantidad),
      unidad:    ing.insumo.unidad,
      precio:    Number(ing.insumo.precio_unitario ?? 0),
    });
  }

  // Recetas por product_id
  const recetaMap: Record<string, { id: string; yieldCajas: number; ingredients: { insumo_id: string; nombre: string; cantidad: number; unidad: string; precio: number }[] }> = {};
  for (const r of (rawRecipes ?? []) as any[]) {
    recetaMap[r.product_id] = {
      id:          r.id,
      yieldCajas:  r.yield_cajas,
      ingredients: ingsByRecipe[r.id] ?? [],
    };
  }

  // Calcular lotes necesarios por producto
  type NeedItem = {
    id: string; name: string; sku: string;
    cajasNecesarias: number; yieldCajas: number; lotes: number;
    demanda: number; stock: number;
    ingredients: { insumo_id: string; nombre: string; cantidad: number; unidad: string; precio: number }[];
  };

  const needItems: NeedItem[] = [];
  const sinIngredientes: { name: string; cajasNecesarias: number }[] = [];

  for (const p of (rawProducts ?? []) as any[]) {
    const stock   = stockProdMap[p.id] ?? 0;
    const minimo  = p.stock_minimo ?? 0;
    const demanda = demandaMap[p.id] ?? 0;
    const cajasNecesarias = Math.max(demanda + minimo - stock, 0);
    if (cajasNecesarias <= 0) continue;

    const receta = recetaMap[p.id];
    if (!receta || receta.ingredients.length === 0) {
      sinIngredientes.push({ name: p.name, cajasNecesarias });
      continue;
    }

    const lotes = Math.ceil(cajasNecesarias / receta.yieldCajas);
    needItems.push({
      id: p.id, name: p.name, sku: p.sku,
      cajasNecesarias, yieldCajas: receta.yieldCajas, lotes,
      demanda, stock,
      ingredients: receta.ingredients,
    });
  }

  // Consolidar ingredientes por insumo_id
  type IngConsolidado = {
    insumo_id: string;
    nombre: string;
    unidad: string;
    totalNecesario: number;  // total para producción
    enStock: number;          // stock_actual del insumo
    aComprar: number;         // max(totalNecesario - enStock, 0)
    bajoPuntoPedido: boolean; // stock_actual < punto_pedido (independiente de producción)
    costoCompra: number;
    productos: string[];
  };

  const ingMap: Record<string, IngConsolidado> = {};
  for (const item of needItems) {
    for (const ing of item.ingredients) {
      if (!ingMap[ing.insumo_id]) {
        const stockData = insumoStockMap[ing.insumo_id];
        const enStock   = stockData?.stockActual ?? 0;
        ingMap[ing.insumo_id] = {
          insumo_id:       ing.insumo_id,
          nombre:          ing.nombre,
          unidad:          ing.unidad,
          totalNecesario:  0,
          enStock,
          aComprar:        0,
          bajoPuntoPedido: stockData ? (enStock < stockData.puntoPedido && stockData.puntoPedido > 0) : false,
          costoCompra:     0,
          productos:       [],
        };
      }
      ingMap[ing.insumo_id].totalNecesario += ing.cantidad * item.lotes;
      if (!ingMap[ing.insumo_id].productos.includes(item.name))
        ingMap[ing.insumo_id].productos.push(item.name);
    }
  }

  // Calcular aComprar y costoCompra después de totalizar
  for (const ing of Object.values(ingMap)) {
    ing.aComprar    = Math.max(ing.totalNecesario - ing.enStock, 0);
    const precio    = insumoStockMap[ing.insumo_id]?.precio ?? 0;
    ing.costoCompra = ing.aComprar * precio;
  }

  const listaProduccion = Object.values(ingMap).sort((a, b) => {
    // Primero los que hay que comprar, luego los que ya están cubiertos
    if ((a.aComprar > 0) !== (b.aComprar > 0)) return a.aComprar > 0 ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

  // Insumos que están bajo punto de pedido pero NO están en la lista de producción
  const insumosSoloReorden = ((rawInsumos ?? []) as any[]).filter((ins: any) => {
    const pd = Number(ins.punto_pedido ?? 0);
    if (pd <= 0) return false;
    const stock = Number(ins.stock_actual ?? 0);
    if (stock >= pd) return false;
    return !ingMap[ins.id]; // no está ya en la lista de producción
  }).map((ins: any) => ({
    id:          ins.id,
    nombre:      ins.nombre,
    unidad:      ins.unidad,
    stockActual: Number(ins.stock_actual ?? 0),
    puntoPedido: Number(ins.punto_pedido ?? 0),
    aReponer:    Number(ins.punto_pedido ?? 0) - Number(ins.stock_actual ?? 0),
    precio:      Number(ins.precio_unitario ?? 0),
  }));

  const costoTotalCompra = listaProduccion.reduce((s, i) => s + i.costoCompra, 0);
  const hayCompras       = listaProduccion.some(i => i.aComprar > 0);
  const hayNada          = listaProduccion.length === 0 && sinIngredientes.length === 0 && insumosSoloReorden.length === 0;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin/cocina" className="text-sm text-neutral-400 hover:text-neutral-700 mb-2 inline-block">
            ← Cocina
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Lista de compras</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Insumos necesarios para la producción pendiente, descontando stock en depósito
          </p>
        </div>
        {hayCompras && <PrintButton />}
      </div>

      {hayNada ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay compras necesarias.</p>
          <p className="text-xs text-neutral-300 mt-1">Todo el stock está cubierto y no hay producción pendiente.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Lista principal: insumos para producción */}
          {listaProduccion.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Para producción</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {needItems.length} producto{needItems.length !== 1 ? "s" : ""} a producir ·{" "}
                    {listaProduccion.filter(i => i.aComprar > 0).length} ingrediente{listaProduccion.filter(i => i.aComprar > 0).length !== 1 ? "s" : ""} a comprar
                  </p>
                </div>
                {costoTotalCompra > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Costo estimado</p>
                    <p className="text-lg font-semibold font-display text-neutral-900">{fmtPeso(costoTotalCompra)}</p>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400">Ingrediente</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Necesario</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">En depósito</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right font-semibold">Comprar</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Costo est.</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400">Se usa en</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {listaProduccion.map((ing) => {
                      const cubierto = ing.aComprar === 0;
                      return (
                        <tr key={ing.insumo_id} className={cubierto ? "opacity-50" : ""}>
                          <td className="px-5 py-3">
                            <span className="font-medium text-neutral-900">{ing.nombre}</span>
                            {ing.bajoPuntoPedido && !cubierto && (
                              <span className="ml-2 text-xs text-amber-600 font-medium">⚠ bajo punto de pedido</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-neutral-500">
                            {fmtCant(ing.totalNecesario)}
                            <span className="text-neutral-300 ml-1">{ing.unidad}</span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            <span className={ing.enStock >= ing.totalNecesario ? "text-emerald-600 font-medium" : "text-neutral-500"}>
                              {fmtCant(ing.enStock)}
                            </span>
                            <span className="text-neutral-300 ml-1">{ing.unidad}</span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums font-semibold">
                            {cubierto ? (
                              <span className="text-emerald-500 text-xs font-normal">✓ cubierto</span>
                            ) : (
                              <span className="text-neutral-900">
                                {fmtCant(ing.aComprar)}
                                <span className="text-neutral-400 font-normal ml-1">{ing.unidad}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-neutral-500 text-xs">
                            {ing.costoCompra > 0 ? fmtPeso(ing.costoCompra) : "—"}
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-400">
                            {ing.productos.join(" · ")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Punto de pedido: insumos bajo mínimo no relacionados a producción hoy */}
          {insumosSoloReorden.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-100">
                <p className="text-sm font-semibold text-amber-800">⚠ Punto de pedido</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Insumos bajo su mínimo aunque no se necesiten para la producción de hoy
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-50 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400">Insumo</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Stock actual</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Punto de pedido</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Reponer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {insumosSoloReorden.map((ins) => (
                    <tr key={ins.id} className="hover:bg-amber-50/50">
                      <td className="px-5 py-3 font-medium text-neutral-800">{ins.nombre}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-amber-700 font-semibold">
                        {fmtCant(ins.stockActual)}
                        <span className="text-neutral-400 font-normal ml-1">{ins.unidad}</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-400">
                        {fmtCant(ins.puntoPedido)}
                        <span className="text-neutral-300 ml-1">{ins.unidad}</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-neutral-800">
                        {fmtCant(ins.aReponer)}
                        <span className="text-neutral-400 font-normal ml-1">{ins.unidad}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Productos sin ingredientes en receta */}
          {sinIngredientes.length > 0 && (
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Sin ingredientes en receta</p>
              <p className="text-xs text-neutral-500 mb-3">
                Necesitan producción pero sus recetas no tienen ingredientes — no se incluyen en la lista.
              </p>
              <div className="flex flex-wrap gap-2">
                {sinIngredientes.map((p) => (
                  <Link key={p.name} href="/admin/cocina/recetas"
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
