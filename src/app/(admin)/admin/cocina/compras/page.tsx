import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Lista de compras — Cocina En Minutas" };
export const revalidate = 0;

// Formatea cantidad: evita decimales innecesarios
function fmtCant(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
}

export default async function ComprasPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Misma lógica que el planificador: qué necesita producción
  const [{ data: rawProducts }, { data: rawPendingLines }, { data: rawRecipes }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, stock_cajas, stock_minimo")
      .eq("is_active", true),

    adminClient
      .from("order_lines")
      .select("product_id, quantity, order:orders!order_id (status)")
      .in("order->status", ["aprobado", "enviado_prod"]),

    adminClient
      .from("recipes")
      .select(`
        id, product_id, yield_cajas,
        ingredients:recipe_ingredients (nombre, cantidad, unidad)
      `),
  ]);

  // Demanda pendiente por producto
  const demandaMap: Record<string, number> = {};
  for (const line of (rawPendingLines ?? []) as any[]) {
    if (!line.product_id) continue;
    demandaMap[line.product_id] = (demandaMap[line.product_id] ?? 0) + line.quantity;
  }

  // Recetas con ingredientes
  const recetaMap: Record<string, { yieldCajas: number; ingredients: { nombre: string; cantidad: number; unidad: string }[] }> = {};
  for (const r of (rawRecipes ?? []) as any[]) {
    recetaMap[r.product_id] = {
      yieldCajas:  r.yield_cajas,
      ingredients: (r.ingredients ?? []).map((ing: any) => ({
        nombre:   ing.nombre,
        cantidad: Number(ing.cantidad),
        unidad:   ing.unidad,
      })),
    };
  }

  // Productos que necesitan producción y tienen ingredientes
  type NeedItem = {
    id: string; name: string; sku: string;
    cajasNecesarias: number; yieldCajas: number;
    lotes: number;
    ingredients: { nombre: string; cantidad: number; unidad: string }[];
  };

  const needItems: NeedItem[] = [];
  const sinRecetaOIng: { name: string; sku: string; cajasNecesarias: number }[] = [];

  for (const p of (rawProducts ?? []) as any[]) {
    const stock   = p.stock_cajas ?? 0;
    const minimo  = p.stock_minimo ?? 0;
    const demanda = demandaMap[p.id] ?? 0;
    const cajasNecesarias = Math.max(minimo - stock, 0) + Math.max(demanda - stock, 0);

    if (cajasNecesarias <= 0) continue;

    const receta = recetaMap[p.id];
    if (!receta || receta.ingredients.length === 0) {
      sinRecetaOIng.push({ name: p.name, sku: p.sku, cajasNecesarias });
      continue;
    }

    const lotes = Math.ceil(cajasNecesarias / receta.yieldCajas);
    needItems.push({
      id: p.id, name: p.name, sku: p.sku,
      cajasNecesarias,
      yieldCajas: receta.yieldCajas,
      lotes,
      ingredients: receta.ingredients,
    });
  }

  // Consolidar ingredientes: sumar por nombre+unidad
  type IngTotal = { nombre: string; unidad: string; total: number; productos: string[] };
  const ingMap: Record<string, IngTotal> = {};

  for (const item of needItems) {
    for (const ing of item.ingredients) {
      const key = `${ing.nombre.toLowerCase()}__${ing.unidad}`;
      const totalIng = ing.cantidad * item.lotes;
      if (!ingMap[key]) {
        ingMap[key] = { nombre: ing.nombre, unidad: ing.unidad, total: 0, productos: [] };
      }
      ingMap[key].total += totalIng;
      if (!ingMap[key].productos.includes(item.name)) {
        ingMap[key].productos.push(item.name);
      }
    }
  }

  const listaCompras = Object.values(ingMap).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const hayNada = needItems.length === 0;

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
        {listaCompras.length > 0 && (
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors print:hidden"
          >
            Imprimir
          </button>
        )}
      </div>

      {hayNada ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay producción pendiente.</p>
          <p className="text-xs text-neutral-300 mt-1">Todo el stock está en nivel óptimo.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Lista de compras consolidada */}
          {listaCompras.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-800">Comprar</p>
                <p className="text-xs text-neutral-400 mt-0.5">{listaCompras.length} ingrediente{listaCompras.length !== 1 ? "s" : ""} · {needItems.length} producto{needItems.length !== 1 ? "s" : ""} a producir</p>
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
                      <td className="px-5 py-3 text-xs text-neutral-400">
                        {ing.productos.join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detalle por producto */}
          {needItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-700">Detalle por producto</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Cajas a producir</th>
                    <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Lotes</th>
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
                      <td className="px-5 py-3 text-center font-semibold text-neutral-900 tabular-nums">
                        {item.cajasNecesarias}
                      </td>
                      <td className="px-5 py-3 text-center text-neutral-600 tabular-nums">
                        {item.lotes} × {item.yieldCajas} caja{item.yieldCajas !== 1 ? "s" : ""}
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

          {/* Sin ingredientes cargados */}
          {sinRecetaOIng.length > 0 && (
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Sin ingredientes en receta</p>
              <p className="text-xs text-neutral-500 mb-3">
                Estos productos necesitan producción pero sus recetas no tienen ingredientes cargados.
              </p>
              <div className="flex flex-wrap gap-2">
                {sinRecetaOIng.map((p) => (
                  <Link key={p.sku} href={`/admin/cocina/recetas`}
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
