import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CocinaClient } from "@/components/admin/cocina-client";
import { resolverRecetas } from "@/lib/receta-base";

export const metadata: Metadata = { title: "Cocina — Admin En Minutas" };
export const revalidate = 0;

export default async function CocinaPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "produccion") redirect("/admin/dashboard");

  const { data: rawPendingOrders } = await adminClient
    .from("orders")
    .select("id")
    .in("status", ["aprobado", "enviado_prod"]);
  const pendingIds = (rawPendingOrders ?? []).map((o: any) => o.id as string);

  const hoy = new Date().toISOString().slice(0, 10);

  const [{ data: rawProducts }, { data: rawPendingLines }, { data: rawRecipes }, { data: rawLotes }, { data: rawTodos }] = await Promise.all([
    adminClient
      .from("products")
      .select("id, name, sku, unit_label, bolsas_caja, stock_minimo, category:categories!category_id (name)")
      .eq("is_active", true)
      .order("name"),

    adminClient
      .from("order_lines")
      .select("product_id, quantity")
      .in("order_id", pendingIds.length > 0 ? pendingIds : ["00000000-0000-0000-0000-000000000000"]),

    adminClient
      .from("recipes")
      .select("product_id, yield_cajas, steps:recipe_steps (minutes)"),

    // Stock real: suma de lotes activos no vencidos
    adminClient
      .from("lotes")
      .select("producto_id, cantidad_actual")
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${hoy}`),

    // Incluye inactivos: el dueño de una receta compartida puede estar inactivo
    adminClient.from("products").select("id, receta_producto_id, kg_caja"),
  ]);

  const products = (rawProducts ?? []) as any[];

  // Stock disponible por producto (desde lotes, igual que Control de Stock)
  const stockMap: Record<string, number> = {};
  for (const l of (rawLotes ?? []) as any[]) {
    stockMap[l.producto_id] = (stockMap[l.producto_id] ?? 0) + Number(l.cantidad_actual);
  }

  // Demanda pendiente por producto
  const demandaMap: Record<string, number> = {};
  for (const line of (rawPendingLines ?? []) as any[]) {
    if (!line.product_id) continue;
    demandaMap[line.product_id] = (demandaMap[line.product_id] ?? 0) + line.quantity;
  }

  // Receta de cada producto: propia o heredada del producto base (presentaciones)
  const recetaMap = resolverRecetas((rawTodos ?? []) as any[], (rawRecipes ?? []) as any[]);

  const items = products.map((p: any) => {
    const rr     = recetaMap[p.id] ?? null;
    const receta = rr
      ? {
          minPorLote: (rr.receta.steps ?? []).reduce((s: number, st: any) => s + Number(st.minutes), 0),
          yieldCajas: Number(rr.receta.yield_cajas),
        }
      : null;
    const stock  = stockMap[p.id] ?? 0;  // stock real desde lotes
    const minimo = p.stock_minimo ?? 0;
    const demanda = demandaMap[p.id] ?? 0;
    const necesita = Math.max(minimo - stock + demanda, 0);
    // necesita está en cajas de esta presentación: se convierte a cajas del base antes de dividir por el rinde
    const minutosEstimados = rr && receta && receta.yieldCajas > 0 && necesita > 0
      ? Math.ceil((receta.minPorLote * necesita * rr.factor) / receta.yieldCajas)
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
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Cocina</h1>
        <p className="text-sm text-neutral-600 mt-1">Stock de producto terminado — registrá lotes y controlá niveles</p>
      </div>
      <CocinaClient items={items} />
    </div>
  );
}
