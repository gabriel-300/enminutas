import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlanificadorClient } from "@/components/admin/planificador-client";

export const metadata: Metadata = { title: "Planificador — Cocina En Minutas" };
export const revalidate = 0;

export default async function PlanificadorPage({
  searchParams,
}: {
  searchParams: Promise<{ personas?: string; horas?: string }>;
}) {
  const sp = await searchParams;
  const personas = Math.max(1, parseInt(sp.personas ?? "2", 10) || 2);
  const horas    = Math.max(0.5, parseFloat(sp.horas ?? "6") || 6);

  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawPendingOrders } = await adminClient
    .from("orders")
    .select("id")
    .in("status", ["aprobado", "enviado_prod"]);
  const pendingIds = (rawPendingOrders ?? []).map((o: any) => o.id as string);

  const [{ data: rawProducts }, { data: rawPendingLines }, { data: rawRecipes }, { data: rawLotes }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, bolsas_caja, stock_minimo, category:categories!category_id (name)")
      .eq("is_active", true),

    adminClient
      .from("order_lines")
      .select("product_id, quantity")
      .in("order_id", pendingIds.length > 0 ? pendingIds : ["00000000-0000-0000-0000-000000000000"]),

    adminClient
      .from("recipes")
      .select("product_id, yield_cajas, steps:recipe_steps (minutes)"),

    // Stock real desde lotes activos
    adminClient
      .from("lotes")
      .select("producto_id, cantidad_actual")
      .eq("activo", true),
  ]);

  // Stock real por producto (suma de lotes activos)
  const stockMap: Record<string, number> = {};
  for (const lote of (rawLotes ?? []) as any[]) {
    if (!lote.producto_id) continue;
    stockMap[lote.producto_id] = (stockMap[lote.producto_id] ?? 0) + Number(lote.cantidad_actual);
  }

  // Demanda pendiente por producto
  const demandaMap: Record<string, number> = {};
  for (const line of (rawPendingLines ?? []) as any[]) {
    if (!line.product_id) continue;
    demandaMap[line.product_id] = (demandaMap[line.product_id] ?? 0) + line.quantity;
  }

  // Recetas: minutos por lote y cajas por lote
  const recetaMap: Record<string, { minPorLote: number; yieldCajas: number }> = {};
  for (const r of (rawRecipes ?? []) as any[]) {
    const minPorLote = (r.steps ?? []).reduce((s: number, st: any) => s + Number(st.minutes), 0);
    recetaMap[r.product_id] = { minPorLote, yieldCajas: r.yield_cajas };
  }

  const items = ((rawProducts ?? []) as any[]).map((p) => {
    const stock   = stockMap[p.id] ?? 0;
    const minimo  = p.stock_minimo ?? 0;
    const demanda = demandaMap[p.id] ?? 0;
    const receta  = recetaMap[p.id] ?? null;

    // Producir para cubrir demanda Y mantener el stock mínimo
    const cajasNecesarias = Math.max(demanda + minimo - stock, 0);

    const minutos = receta && receta.yieldCajas > 0 && cajasNecesarias > 0
      ? Math.ceil((receta.minPorLote * cajasNecesarias) / receta.yieldCajas)
      : null;

    return {
      id:               p.id,
      name:             p.name,
      sku:              p.sku,
      categoria:        p.category?.name ?? "Sin categoría",
      stock,
      minimo,
      demanda,
      cajasNecesarias,
      minutos,
      tieneReceta:      !!receta,
      urgente:          demanda > 0 && stock < demanda,
    };
  })
  .filter((i) => i.cajasNecesarias > 0)
  .sort((a, b) => {
    // Urgentes primero (demanda > stock), luego por cajas necesarias descendente
    if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
    return b.cajasNecesarias - a.cajasNecesarias;
  });

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/cocina" className="text-sm text-neutral-400 hover:text-neutral-700 mb-2 inline-block">
          ← Cocina
        </Link>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Planificador del día</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Calculá qué podés producir con el personal disponible hoy
        </p>
      </div>

      <PlanificadorClient
        items={items}
        personasInit={personas}
        horasInit={horas}
      />
    </div>
  );
}
