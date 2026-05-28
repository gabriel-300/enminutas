import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard — Admin En Minutas" };
export const revalidate = 0;

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered"];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return fmt(n);
};

function pctChange(current: number, prev: number) {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export default async function DashboardPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now           = new Date();
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const sixMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const db = adminClient as any;

  const [
    { count: pendingOrders },
    { count: inProd },
    { data: revenueData },
    { data: prevRevenueData },
    { data: monthlyOrdersRaw },
    { data: lastOrdersRaw },
    { data: { users } },
  ] = await Promise.all([
    db.from("orders").select("*", { count: "exact", head: true })
      .eq("channel", "b2b_mayorista").eq("status", "pending_payment"),

    db.from("orders").select("*", { count: "exact", head: true })
      .eq("channel", "b2b_mayorista").in("status", ["aprobado", "enviado_prod"]),

    // Facturación este mes
    db.from("orders").select("total")
      .eq("channel", "b2b_mayorista").in("status", ACTIVE_STATUSES)
      .gte("created_at", monthStart),

    // Facturación mes anterior
    db.from("orders").select("total")
      .eq("channel", "b2b_mayorista").in("status", ACTIVE_STATUSES)
      .gte("created_at", prevMonthStart).lt("created_at", monthStart),

    // Pedidos activos últimos 6 meses (para evolución + top productos)
    db.from("orders")
      .select("id, total, created_at, lines:order_lines(line_total, product_snapshot)")
      .eq("channel", "b2b_mayorista").in("status", ACTIVE_STATUSES)
      .gte("created_at", sixMonthsAgo)
      .order("created_at", { ascending: false }),

    // Último pedido por cliente (para días de inactividad)
    db.from("orders").select("customer_id, created_at")
      .eq("channel", "b2b_mayorista").neq("status", "cancelled")
      .order("created_at", { ascending: false }),

    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // ── Clientes B2B ─────────────────────────────────────────────────────
  const b2bUsers = (users ?? []).filter((u: any) => u.app_metadata?.role === "customer_b2b");
  const b2bIds   = b2bUsers.map((u: any) => u.id);

  const { data: b2bProfiles } = b2bIds.length > 0
    ? await db.from("profiles").select("id, full_name, b2b_status").in("id", b2bIds)
    : { data: [] };

  const profileMap: Record<string, any> = Object.fromEntries(
    (b2bProfiles ?? []).map((p: any) => [p.id, p])
  );

  const pendingClients = b2bUsers.filter((u: any) => profileMap[u.id]?.b2b_status === "pendiente").length;
  const activeClients  = b2bUsers.filter((u: any) => profileMap[u.id]?.b2b_status === "activo").length;
  const activeB2B      = b2bUsers
    .filter((u: any) => profileMap[u.id]?.b2b_status === "activo")
    .map((u: any) => ({ id: u.id, full_name: profileMap[u.id]?.full_name ?? u.email ?? "—" }));

  // ── Días de inactividad por cliente ──────────────────────────────────
  const lastOrderByClient: Record<string, Date> = {};
  for (const o of (lastOrdersRaw ?? []) as any[]) {
    if (o.customer_id && !lastOrderByClient[o.customer_id]) {
      lastOrderByClient[o.customer_id] = new Date(o.created_at);
    }
  }

  const inactivos = activeB2B
    .map((c: any) => {
      const last = lastOrderByClient[c.id];
      const days = last
        ? Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return { ...c, days };
    })
    .filter((c: any) => c.days > 15)
    .sort((a: any, b: any) => b.days - a.days);

  // ── KPIs ─────────────────────────────────────────────────────────────
  const revenueTotal  = (revenueData ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
  const prevRevenue   = (prevRevenueData ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
  const revPct        = pctChange(revenueTotal, prevRevenue);

  const monthlyOrders = (monthlyOrdersRaw ?? []) as any[];
  const ordersThisMonth = monthlyOrders.filter((o) => o.created_at >= monthStart).length;
  const ordersPrevMonth = monthlyOrders.filter(
    (o) => o.created_at >= prevMonthStart && o.created_at < monthStart
  ).length;

  const totalAlerts = inactivos.length + (pendingOrders ?? 0) + pendingClients;

  // ── Top productos ─────────────────────────────────────────────────────
  const productMap: Record<string, number> = {};
  for (const order of monthlyOrders) {
    for (const line of (order.lines ?? [])) {
      const name = line.product_snapshot?.name ?? "Producto";
      productMap[name] = (productMap[name] ?? 0) + Number(line.line_total);
    }
  }
  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxProduct = topProducts[0]?.[1] ?? 1;

  // ── Evolución mensual ─────────────────────────────────────────────────
  const monthMap: Record<string, number> = {};
  for (const o of monthlyOrders) {
    const d = new Date(o.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[k] = (monthMap[k] ?? 0) + Number(o.total);
  }
  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const monthlyEvol = monthKeys.map((k) => ({
    key:     k,
    total:   monthMap[k] ?? 0,
    label:   new Date(Number(k.split("-")[0]), Number(k.split("-")[1]) - 1)
               .toLocaleDateString("es-AR", { month: "short" }),
    current: k === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  }));
  const maxMonth = Math.max(...monthlyEvol.map((m) => m.total), 1);

  const mesNombre = now.toLocaleDateString("es-AR", { month: "long" });

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-0.5 capitalize">
          {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Ventas */}
        <Link href="/admin/reportes" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Ventas {mesNombre}</p>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(revenueTotal)}</p>
          {revPct !== null && (
            <p className={`text-xs mt-1 font-medium ${revPct >= 0 ? "text-success" : "text-danger"}`}>
              {revPct >= 0 ? "↑" : "↓"} {Math.abs(revPct)}% vs {new Date(now.getFullYear(), now.getMonth() - 1).toLocaleDateString("es-AR", { month: "long" })}
            </p>
          )}
        </Link>

        {/* Pedidos este mes */}
        <Link href="/admin/pedidos" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Pedidos {mesNombre}</p>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{ordersThisMonth}</p>
          <p className="text-xs mt-1 text-neutral-400">
            {ordersPrevMonth} el mes anterior
          </p>
        </Link>

        {/* Alertas */}
        <div className={`rounded-2xl border p-5 ${totalAlerts > 0 ? "bg-warning-bg/40 border-warning/30" : "bg-white border-neutral-200"}`}>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Alertas activas</p>
          <p className={`text-3xl font-semibold font-display tabular-nums ${totalAlerts > 0 ? "text-warning" : "text-neutral-900"}`}>
            {totalAlerts}
          </p>
          <p className="text-xs mt-1 text-neutral-400">
            {inactivos.length} clientes inactivos
          </p>
        </div>

        {/* Clientes */}
        <Link href="/admin/clientes-b2b" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Clientes activos</p>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{activeClients}</p>
          <p className="text-xs mt-1 text-neutral-400">
            {b2bUsers.length} totales{pendingClients > 0 ? ` · ${pendingClients} pendientes` : ""}
          </p>
        </Link>
      </div>

      {/* Cuerpo — dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Columna izquierda (3/5) */}
        <div className="lg:col-span-3 space-y-4">

          {/* Alertas */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Alertas</p>
            </div>
            {totalAlerts === 0 ? (
              <p className="px-5 py-8 text-sm text-neutral-400 text-center">Sin alertas activas</p>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {/* Clientes inactivos — uno por uno */}
                {inactivos.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3 bg-danger-bg/30">
                    <span className="size-1.5 rounded-full bg-danger shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{c.full_name}</span>{" "}
                      <span className="text-neutral-500">
                        sin pedir hace {c.days === 999 ? "más de 30" : c.days} días
                      </span>
                    </p>
                    <Link href="/admin/clientes-b2b" className="text-xs text-tierra-700 hover:underline shrink-0">
                      Ver →
                    </Link>
                  </li>
                ))}

                {/* Pedidos pendientes */}
                {(pendingOrders ?? 0) > 0 && (
                  <li className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                    <span className="size-1.5 rounded-full bg-warning shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{pendingOrders}</span>{" "}
                      <span className="text-neutral-500">pedido{pendingOrders !== 1 ? "s" : ""} B2B esperando aprobación</span>
                    </p>
                    <Link href="/admin/pedidos" className="text-xs text-tierra-700 hover:underline shrink-0">
                      Ver →
                    </Link>
                  </li>
                )}

                {/* Clientes pendientes de alta */}
                {pendingClients > 0 && (
                  <li className="flex items-center gap-3 px-5 py-3 bg-success-bg/30">
                    <span className="size-1.5 rounded-full bg-success shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{pendingClients}</span>{" "}
                      <span className="text-neutral-500">solicitud{pendingClients !== 1 ? "es" : ""} de alta esperando aprobación</span>
                    </p>
                    <Link href="/admin/clientes-b2b" className="text-xs text-tierra-700 hover:underline shrink-0">
                      Ver →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Accesos rápidos</p>
            </div>
            <ul className="divide-y divide-neutral-50">
              {[
                {
                  href: "/admin/pedidos",
                  label: "Cola de pedidos",
                  badge: (pendingOrders ?? 0) > 0 ? `${pendingOrders} pendientes` : null,
                  icon: "📋",
                },
                {
                  href: "/admin/clientes-b2b",
                  label: "Clientes B2B",
                  badge: pendingClients > 0 ? `${pendingClients} para aprobar` : null,
                  icon: "👥",
                },
                {
                  href: "/admin/produccion",
                  label: "Producción",
                  badge: (inProd ?? 0) > 0 ? `${inProd} en proceso` : null,
                  icon: "🏭",
                },
                {
                  href: "/admin/reportes",
                  label: "Exportar reporte del mes",
                  badge: null,
                  icon: "📊",
                },
                {
                  href: "/admin/zonas",
                  label: "Configurar zonas y fletes",
                  badge: null,
                  icon: "📍",
                },
              ].map(({ href, label, badge, icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{icon}</span>
                      <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{label}</span>
                      {badge && (
                        <span className="px-2 py-0.5 rounded-full bg-warning-bg text-warning text-xs font-medium">
                          {badge}
                        </span>
                      )}
                    </div>
                    <span className="text-neutral-300 group-hover:text-neutral-500 text-sm">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Columna derecha (2/5) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Top productos */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Productos más vendidos</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">Sin datos</p>
              ) : topProducts.map(([name, total]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-700 truncate max-w-[140px]" title={name}>{name}</span>
                    <span className="text-xs font-semibold text-neutral-900 tabular-nums">{fmtK(total)}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-tierra-700 rounded-full"
                      style={{ width: `${Math.round((total / maxProduct) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evolución mensual */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Evolución mensual</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {monthlyEvol.map((m) => (
                <div key={m.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs capitalize ${m.current ? "font-bold text-neutral-900" : "text-neutral-500"}`}>
                      {m.label}{m.current ? " (actual)" : ""}
                    </span>
                    <span className={`text-xs tabular-nums ${m.current ? "font-bold text-tierra-700" : "font-medium text-neutral-700"}`}>
                      {m.total > 0 ? fmtK(m.total) : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.current ? "bg-tierra-700" : "bg-tierra-300"}`}
                      style={{ width: m.total > 0 ? `${Math.round((m.total / maxMonth) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
