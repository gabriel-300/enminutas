import { createAdminClient } from "@/lib/supabase/server";
import type { OrderStatus } from "../_lib/helpers";
import { ahoraAR } from "@/lib/fecha";

export async function loadDistribucionDashboard(user: { id: string }) {
  const adminClient = createAdminClient();
  const db  = adminClient;
  const now = ahoraAR();

  // Zona asignada
  const { data: perfilDist } = await db
    .from("profiles")
    .select("zona_id, zona:delivery_zones!zona_id(name)")
    .eq("id", user.id)
    .maybeSingle();

  const zonaFiltro  = perfilDist?.zona_id ?? null;
  const zonaNombre  = (perfilDist?.zona as any)?.name ?? null;

  const hoyInicio = new Date(now);
  hoyInicio.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const buildQ = (status: OrderStatus) => {
    let q = db.from("orders")
      .select("id, order_number, entregado_at, despachado_at, customer:profiles!customer_id(full_name, zona:delivery_zones!zona_id(name)), lines:order_lines(quantity, product_snapshot)")
      .eq("channel", "b2b_mayorista").eq("status", status);
    if (zonaFiltro) q = q.eq("delivery_zone_id", zonaFiltro);
    return q;
  };

  const [
    { data: enTransito },
    { data: entregadosHoy },
    { data: entregadosHistorico },
  ] = await Promise.all([
    buildQ("despachado").order("despachado_at", { ascending: true }),
    buildQ("delivered").gte("entregado_at", hoyInicio.toISOString()).order("entregado_at", { ascending: false }),
    buildQ("delivered").gte("entregado_at", sixMonthsAgo.toISOString()).order("entregado_at", { ascending: false }),
  ]);

  const enTransitoList    = (enTransito ?? []) as any[];
  const entregadosHoyList = (entregadosHoy ?? []) as any[];
  const historico         = (entregadosHistorico ?? []) as any[];

  // Agrupar histórico por mes
  const byMonth: Record<string, number> = {};
  for (const o of historico) {
    const d = new Date(o.entregado_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[k] = (byMonth[k] ?? 0) + 1;
  }
  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const evolucion = monthKeys.map((k) => ({
    key:     k,
    count:   byMonth[k] ?? 0,
    label:   new Date(Number(k.split("-")[0]), Number(k.split("-")[1]) - 1)
               .toLocaleDateString("es-AR", { month: "short" }),
    current: k === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  }));
  const maxMonth = Math.max(...evolucion.map((m) => m.count), 1);

  // Total este mes
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const entregasMes = byMonth[mesActual] ?? 0;

  return { now, zonaFiltro, zonaNombre, enTransitoList, entregadosHoyList, evolucion, maxMonth, entregasMes };
}
