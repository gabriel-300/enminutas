import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

export default async function HistorialDistribucionPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Zona del usuario si es distribucion
  const esDistribucion = user.app_metadata?.role === "distribucion";
  let zonaFiltro: string | null = null;
  if (esDistribucion) {
    const { data: perfil } = await (adminClient as any)
      .from("profiles").select("zona_id").eq("id", user.id).maybeSingle();
    zonaFiltro = perfil?.zona_id ?? null;
  }

  // Últimos 30 días de entregas
  const desde = new Date();
  desde.setDate(desde.getDate() - 30);

  let q = (adminClient as any)
    .from("orders")
    .select("id, order_number, entregado_at, customer:profiles!customer_id(full_name)")
    .eq("channel", "b2b_mayorista")
    .eq("status", "delivered")
    .gte("entregado_at", desde.toISOString())
    .order("entregado_at", { ascending: false });

  if (esDistribucion && zonaFiltro) q = q.eq("delivery_zone_id", zonaFiltro);

  const { data: ordersRaw } = await q;
  const orders = (ordersRaw ?? []) as any[];

  // Agrupar por fecha (día)
  const byDate: Record<string, { fecha: string; label: string; count: number }> = {};
  for (const o of orders) {
    const d     = new Date(o.entregado_at);
    const key   = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    if (!byDate[key]) byDate[key] = { fecha: key, label, count: 0 };
    byDate[key].count++;
  }

  const dias = Object.values(byDate).sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-5 md:mb-6 flex items-center gap-4">
        <Link href="/admin/distribucion" className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
          ← Volver
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Historial de entregas</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Últimos 30 días</p>
        </div>
      </div>

      {dias.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay entregas registradas en los últimos 30 días.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dias.map((d) => (
            <Link
              key={d.fecha}
              href={`/admin/distribucion/hoja-de-ruta?fecha=${d.fecha}`}
              target="_blank"
              className="flex items-center justify-between bg-white rounded-2xl border border-neutral-200 px-5 py-4 hover:border-neutral-300 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900 capitalize">{d.label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{d.fecha}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-neutral-700">
                  {d.count} entrega{d.count !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-tierra-700 group-hover:underline">Ver hoja →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
