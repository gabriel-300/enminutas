import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard — Admin En Minutas" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);

function StatCard({
  label, value, sub, href, accent,
}: {
  label:   string;
  value:   string | number;
  sub?:    string;
  href?:   string;
  accent?: boolean;
}) {
  const inner = (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-1 ${accent ? "border-warning/40 bg-warning-bg/30" : "border-neutral-200"}`}>
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-semibold font-display tabular-nums ${accent ? "text-warning" : "text-neutral-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="hover:opacity-80 transition-opacity">{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const cutoff15d  = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const db = adminClient as any;

  const [
    { count: pendingOrders },
    { count: inProd },
    { data: revenueData },
    { data: recentOrders },
    { data: recentOrderIds },
    { data: { users } },
  ] = await Promise.all([
    // Pedidos B2B esperando aprobación
    db.from("orders")
      .select("*", { count: "exact", head: true })
      .eq("channel", "b2b_mayorista").eq("status", "pending_payment"),

    // Pedidos en producción (aprobado + enviado_prod)
    db.from("orders")
      .select("*", { count: "exact", head: true })
      .eq("channel", "b2b_mayorista")
      .in("status", ["aprobado", "enviado_prod"]),

    // Facturación este mes
    db.from("orders")
      .select("total")
      .eq("channel", "b2b_mayorista")
      .not("status", "in", "(cancelled,refunded)")
      .gte("created_at", monthStart),

    // Últimos 8 pedidos B2B
    db.from("orders")
      .select("id, order_number, status, total, created_at, customer:profiles!customer_id (full_name)")
      .eq("channel", "b2b_mayorista")
      .order("created_at", { ascending: false })
      .limit(8),

    // Clientes con pedido reciente (últimos 15 días)
    db.from("orders")
      .select("customer_id")
      .eq("channel", "b2b_mayorista")
      .gte("created_at", cutoff15d),

    // Auth users para contar clientes B2B
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const b2bUsers  = (users ?? []).filter((u) => u.app_metadata?.role === "customer_b2b");
  const b2bIds    = b2bUsers.map((u) => u.id);

  // Perfiles de clientes B2B para b2b_status y full_name
  const { data: b2bProfiles } = b2bIds.length > 0
    ? await db.from("profiles").select("id, full_name, b2b_status").in("id", b2bIds)
    : { data: [] };

  const profileMap: Record<string, any> = Object.fromEntries(
    (b2bProfiles ?? []).map((p: any) => [p.id, p])
  );

  const pendingClients = b2bUsers.filter((u) => profileMap[u.id]?.b2b_status === "pendiente").length;
  const activeClients  = b2bUsers.filter((u) => profileMap[u.id]?.b2b_status === "activo").length;
  const activeB2B      = b2bUsers
    .filter((u) => profileMap[u.id]?.b2b_status === "activo")
    .map((u) => ({ id: u.id, full_name: profileMap[u.id]?.full_name ?? u.email ?? u.id.slice(0, 8) }));

  const revenueTotal = (revenueData ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);

  const activeIds = new Set((recentOrderIds ?? []).map((o: any) => o.customer_id).filter(Boolean));
  const inactivos = activeB2B.filter((c) => !activeIds.has(c.id));

  const totalAlerts = (pendingClients ?? 0) + (pendingOrders ?? 0) + inactivos.length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pedidos pendientes"
          value={pendingOrders ?? 0}
          sub="esperando aprobación"
          href="/admin/pedidos"
          accent={(pendingOrders ?? 0) > 0}
        />
        <StatCard
          label="En producción"
          value={inProd ?? 0}
          sub="aprobado + en preparación"
          href="/admin/produccion"
        />
        <StatCard
          label="Clientes activos"
          value={activeClients ?? 0}
          sub="canal B2B"
          href="/admin/clientes-b2b"
        />
        <StatCard
          label={`Facturación ${now.toLocaleDateString("es-AR", { month: "long" })}`}
          value={fmt(revenueTotal)}
          sub="pedidos B2B confirmados"
        />
      </div>

      {/* Alertas */}
      {totalAlerts > 0 && (
        <div className="mb-8 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <span className="size-5 rounded-full bg-warning flex items-center justify-center text-white text-xs font-bold">
              {totalAlerts}
            </span>
            <p className="text-sm font-medium text-neutral-700">Alertas</p>
          </div>
          <ul className="divide-y divide-neutral-50">
            {(pendingClients ?? 0) > 0 && (
              <li className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-neutral-700">
                  <span className="font-semibold text-warning">{pendingClients}</span>{" "}
                  cliente{pendingClients !== 1 ? "s" : ""} pendiente{pendingClients !== 1 ? "s" : ""} de aprobación
                </p>
                <Link href="/admin/clientes-b2b" className="text-xs text-tierra-700 hover:underline">
                  Ver →
                </Link>
              </li>
            )}
            {(pendingOrders ?? 0) > 0 && (
              <li className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-neutral-700">
                  <span className="font-semibold text-warning">{pendingOrders}</span>{" "}
                  pedido{pendingOrders !== 1 ? "s" : ""} B2B esperando aprobación
                </p>
                <Link href="/admin/pedidos" className="text-xs text-tierra-700 hover:underline">
                  Ver →
                </Link>
              </li>
            )}
            {inactivos.length > 0 && (
              <li className="px-5 py-3">
                <p className="text-sm text-neutral-700 mb-2">
                  <span className="font-semibold text-warning">{inactivos.length}</span>{" "}
                  cliente{inactivos.length !== 1 ? "s" : ""} sin pedidos en los últimos 15 días
                </p>
                <ul className="flex flex-wrap gap-2">
                  {inactivos.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <span className="px-2.5 py-1 bg-neutral-100 rounded-lg text-xs text-neutral-600">
                        {c.full_name ?? c.id.slice(0, 8)}
                      </span>
                    </li>
                  ))}
                  {inactivos.length > 6 && (
                    <li>
                      <span className="px-2.5 py-1 bg-neutral-100 rounded-lg text-xs text-neutral-400">
                        +{inactivos.length - 6} más
                      </span>
                    </li>
                  )}
                </ul>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Últimos pedidos */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">Últimos pedidos B2B</p>
          <Link href="/admin/pedidos" className="text-xs text-tierra-700 hover:underline">
            Ver todos →
          </Link>
        </div>
        {(recentOrders ?? []).length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-400 text-center">No hay pedidos todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-50">
              {(recentOrders ?? []).map((o: any) => (
                <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="font-mono text-xs text-tierra-700 hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-700 text-sm">
                    {o.customer?.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-neutral-900 tabular-nums">
                    {fmt(Number(o.total))}
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400 text-right whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                    })}
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
