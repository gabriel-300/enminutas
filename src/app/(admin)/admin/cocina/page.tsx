import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CocinaClient } from "@/components/admin/cocina-client";

export const metadata: Metadata = { title: "Cocina — Admin En Minutas" };
export const revalidate = 0;

export default async function CocinaPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rawProducts }, { data: rawPendingLines }, { data: rawRecipes }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, unit_label, bolsas_caja, stock_cajas, stock_minimo, category:categories!category_id (name)")
      .eq("is_active", true)
      .order("name"),

    adminClient
      .from("order_lines")
      .select("product_id, quantity, order:orders!order_id (status)")
      .in("order->status", ["aprobado", "enviado_prod"]),

    adminClient
      .from("recipes")
      .select("product_id, yield_cajas, steps:recipe_steps (minutes)"),
  ]);

  const products = (rawProducts ?? []) as any[];

  // Demanda pendiente por producto
  const demandaMap: Record<string, number> = {};
  for (const line of (rawPendingLines ?? []) as any[]) {
    if (!line.product_id) continue;
    demandaMap[line.product_id] = (demandaMap[line.product_id] ?? 0) + line.quantity;
  }

  // Minutos por lote y cajas por lote para cada receta
  const recetaMap: Record<string, { minPorLote: number; yieldCajas: number }> = {};
  for (const r of (rawRecipes ?? []) as any[]) {
    const minPorLote = (r.steps ?? []).reduce((s: number, st: any) => s + Number(st.minutes), 0);
    recetaMap[r.product_id] = { minPorLote, yieldCajas: r.yield_cajas };
  }

  const items = products.map((p: any) => {
    const receta = recetaMap[p.id] ?? null;
    const stock  = p.stock_cajas ?? 0;
    const minimo = p.stock_minimo ?? 0;
    const demanda = demandaMap[p.id] ?? 0;
    const necesita = Math.max(minimo - stock + demanda, 0);
    const minutosEstimados = receta && receta.yieldCajas > 0 && necesita > 0
      ? Math.ceil((receta.minPorLote * necesita) / receta.yieldCajas)
      : null;

    return {
      id:                p.id,
      name:              p.name,
      sku:               p.sku,
      unit_label:        p.unit_label,
      bolsas_caja:       p.bolsas_caja,
      categoria:         p.category?.name ?? "Sin categoría",
      stock,
      minimo,
      demanda,
      tieneReceta:       !!receta,
      minutosEstimados,
    };
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Cocina</h1>
        <p className="text-sm text-neutral-500 mt-1">Stock de producto terminado — registrá lotes y controlá niveles</p>
      </div>
      <CocinaClient items={items} />
    </div>
  );
}
