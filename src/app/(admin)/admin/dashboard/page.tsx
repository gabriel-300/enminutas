import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ahoraAR } from "@/lib/fecha";

export const metadata: Metadata = { title: "Dashboard — Admin En Minutas" };
export const revalidate = 0;

function DI({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

// Íconos reutilizables para accesos rápidos
const IC = {
  pedidos:      <DI d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />,
  clientesB2B:  <DI d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />,
  clientesB2C:  <DI d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />,
  produccion:   <DI d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />,
  cocina:       <DI d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" d2="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />,
  planificador: <DI d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />,
  compras:      <DI d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />,
  reportes:     <DI d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />,
  zonas:        <DI d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" d2="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />,
  distribucion: <DI d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />,
  clock:        <DI d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
  preventista:  <DI d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />,
  nuevoPedido:  <DI d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "en_distribucion", "entrega_parcial", "delivered", "liquidado"];

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

  const role = user.app_metadata?.role as string | undefined;

  // ── Dashboard del vendedor ────────────────────────────────────────────
  if (role === "vendedor") {
    const now        = ahoraAR();
    const mes        = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const mesNombre  = now.toLocaleDateString("es-AR", { month: "long" });
    const db         = adminClient as any;

    // Clientes asignados
    const { data: clientesMios } = await db
      .from("profiles")
      .select("id, full_name, zona:delivery_zones!zona_id (name)")
      .eq("role", "customer_b2b")
      .eq("b2b_status", "activo")
      .eq("vendedor_id", user.id);

    const misIds = (clientesMios ?? []).map((c: any) => c.id);

    // Meta del mes + ventas + pedidos + últimos contactos (en paralelo)
    const [
      { data: metaData },
      { data: ventasData },
      { count: pedidosPendientes },
      { count: pedidosEnProd },
      { data: lastOrdersRaw },
      { data: ultimosContactos },
    ] = await Promise.all([
      db.from("sales_goals").select("objetivo").eq("vendedor_id", user.id).eq("mes", mes).maybeSingle(),

      misIds.length > 0
        ? db.from("orders").select("total")
            .in("customer_id", misIds).eq("channel", "b2b_mayorista")
            .in("status", ACTIVE_STATUSES).gte("created_at", monthStart)
        : Promise.resolve({ data: [] }),

      misIds.length > 0
        ? db.from("orders").select("*", { count: "exact", head: true })
            .in("customer_id", misIds).eq("channel", "b2b_mayorista").eq("status", "pending_payment")
        : Promise.resolve({ count: 0 }),

      misIds.length > 0
        ? db.from("orders").select("*", { count: "exact", head: true })
            .in("customer_id", misIds).eq("channel", "b2b_mayorista").in("status", ["aprobado", "enviado_prod"])
        : Promise.resolve({ count: 0 }),

      misIds.length > 0
        ? db.from("orders").select("customer_id, created_at")
            .in("customer_id", misIds).eq("channel", "b2b_mayorista")
            .neq("status", "cancelled").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      db.from("contact_logs")
        .select("tipo, notas, created_at, cliente:profiles!cliente_id(full_name)")
        .eq("vendedor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    // Días de inactividad por cliente
    const lastOrderMap: Record<string, number> = {};
    for (const o of (lastOrdersRaw ?? []) as any[]) {
      if (!lastOrderMap[o.customer_id]) {
        lastOrderMap[o.customer_id] = Math.floor(
          (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    const clientesConDias = (clientesMios ?? [])
      .map((c: any) => ({ ...c, dias: lastOrderMap[c.id] ?? null }))
      .sort((a: any, b: any) => {
        if (a.dias === null && b.dias === null) return 0;
        if (a.dias === null) return -1;
        if (b.dias === null) return 1;
        return b.dias - a.dias;
      });

    const sinPedidos  = clientesConDias.filter((c: any) => c.dias === null);
    const inactivos30 = clientesConDias.filter((c: any) => c.dias !== null && c.dias > 30);
    const inactivos15 = clientesConDias.filter((c: any) => c.dias !== null && c.dias > 15 && c.dias <= 30);
    const activosCnt  = clientesConDias.filter((c: any) => c.dias !== null && c.dias <= 15).length;

    const ventasMes   = (ventasData ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
    const objetivo    = Number(metaData?.objetivo ?? 0);
    const pctMeta     = objetivo > 0 ? Math.min(Math.round((ventasMes / objetivo) * 100), 100) : null;
    const totalPend   = (pedidosPendientes ?? 0) + (pedidosEnProd ?? 0);
    const totalInact  = sinPedidos.length + inactivos30.length + inactivos15.length;

    return (
      <div className="p-4 md:p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-5 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-0.5 capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
          {/* Meta del mes */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Meta {mesNombre}</p>
            <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(ventasMes)}</p>
            {objetivo > 0 ? (
              <>
                <div className="mt-2 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pctMeta! >= 100 ? "bg-success" : pctMeta! >= 60 ? "bg-tierra-700" : "bg-warning"}`}
                    style={{ width: `${pctMeta}%` }}
                  />
                </div>
                <p className="text-xs mt-1 text-neutral-400">{pctMeta}% de {fmtK(objetivo)}</p>
              </>
            ) : (
              <p className="text-xs mt-1 text-neutral-300">Sin meta definida</p>
            )}
          </div>

          {/* Mis clientes */}
          <Link href="/admin/preventista" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Mis clientes</p>
            <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{misIds.length}</p>
            <p className="text-xs mt-1 text-neutral-400">{activosCnt} activos · {totalInact} inactivos</p>
          </Link>

          {/* Inactivos */}
          <div className={`rounded-2xl border p-5 ${(sinPedidos.length + inactivos30.length) > 0 ? "bg-danger-bg/40 border-danger/30" : inactivos15.length > 0 ? "bg-warning-bg/40 border-warning/30" : "bg-white border-neutral-200"}`}>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Requieren contacto</p>
            <p className={`text-3xl font-semibold font-display tabular-nums ${(sinPedidos.length + inactivos30.length) > 0 ? "text-danger" : inactivos15.length > 0 ? "text-warning" : "text-neutral-900"}`}>
              {totalInact}
            </p>
            <p className="text-xs mt-1 text-neutral-400">
              {sinPedidos.length > 0 && `${sinPedidos.length} sin pedidos`}
              {sinPedidos.length > 0 && inactivos30.length > 0 && " · "}
              {inactivos30.length > 0 && `${inactivos30.length} +30d`}
              {(sinPedidos.length + inactivos30.length) > 0 && inactivos15.length > 0 && " · "}
              {inactivos15.length > 0 && `${inactivos15.length} 15–30d`}
              {totalInact === 0 && "Todos activos"}
            </p>
          </div>

          {/* Pedidos en proceso */}
          <Link href="/admin/pedidos" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">En proceso</p>
            <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{totalPend}</p>
            <p className="text-xs mt-1 text-neutral-400">
              {(pedidosPendientes ?? 0) > 0 && `${pedidosPendientes} pend. aprobación`}
              {(pedidosPendientes ?? 0) > 0 && (pedidosEnProd ?? 0) > 0 && " · "}
              {(pedidosEnProd ?? 0) > 0 && `${pedidosEnProd} en producción`}
              {totalPend === 0 && "Sin pedidos activos"}
            </p>
          </Link>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Izquierda: alertas + accesos */}
          <div className="lg:col-span-3 space-y-4">

            {/* Alertas */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Mis alertas</p>
              </div>
              {totalInact === 0 && (pedidosPendientes ?? 0) === 0 ? (
                <p className="px-5 py-8 text-sm text-neutral-400 text-center">Sin alertas activas</p>
              ) : (
                <ul className="divide-y divide-neutral-50">
                  {sinPedidos.map((c: any) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3 bg-danger-bg/30">
                      <span className="size-1.5 rounded-full bg-danger shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{c.full_name}</span>{" "}
                        <span className="text-neutral-500">sin pedidos registrados — primer contacto</span>
                      </p>
                      <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
                    </li>
                  ))}
                  {inactivos30.map((c: any) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3 bg-danger-bg/30">
                      <span className="size-1.5 rounded-full bg-danger shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{c.full_name}</span>{" "}
                        <span className="text-neutral-500">sin comprar hace {c.dias} días</span>
                      </p>
                      <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
                    </li>
                  ))}
                  {inactivos15.map((c: any) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                      <span className="size-1.5 rounded-full bg-warning shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{c.full_name}</span>{" "}
                        <span className="text-neutral-500">sin comprar hace {c.dias} días</span>
                      </p>
                      <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
                    </li>
                  ))}
                  {(pedidosPendientes ?? 0) > 0 && (
                    <li className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                      <span className="size-1.5 rounded-full bg-warning shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{pedidosPendientes}</span>{" "}
                        <span className="text-neutral-500">pedido{pedidosPendientes !== 1 ? "s" : ""} esperando aprobación</span>
                      </p>
                      <Link href="/admin/pedidos" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
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
                {([
                  { href: "/admin/preventista",   label: "Mis clientes", badge: totalInact > 0 ? `${totalInact} para contactar` : null, icon: IC.preventista },
                  { href: "/admin/pedidos/nuevo", label: "Nuevo pedido",  badge: null, icon: IC.nuevoPedido },
                  { href: "/admin/pedidos",       label: "Ver pedidos",   badge: (pedidosPendientes ?? 0) > 0 ? `${pedidosPendientes} pendientes` : null, icon: IC.pedidos },
                ] as { href: string; label: string; badge: string | null; icon: React.ReactNode }[]).map(({ href, label, badge, icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-400 flex items-center">{icon}</span>
                        <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{label}</span>
                        {badge && (
                          <span className="px-2 py-0.5 rounded-full bg-warning-bg text-warning text-xs font-medium">{badge}</span>
                        )}
                      </div>
                      <span className="text-neutral-300 group-hover:text-neutral-500 text-sm">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Derecha: últimos contactos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Últimos contactos</p>
                <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline">Ver todo →</Link>
              </div>
              {(ultimosContactos ?? []).length === 0 ? (
                <p className="px-5 py-8 text-sm text-neutral-400 text-center">Todavía no registraste contactos.</p>
              ) : (
                <ul className="divide-y divide-neutral-50">
                  {(ultimosContactos as any[]).map((c, i) => {
                    const dias = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    const TIPO_EMOJI: Record<string, string> = {
                      llamada: "📞", visita: "🏪", whatsapp: "💬", email: "✉️", otro: "·",
                    };
                    return (
                      <li key={i} className="px-5 py-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm">{TIPO_EMOJI[c.tipo] ?? "·"}</span>
                          <span className="text-sm font-medium text-neutral-800 truncate">
                            {(c.cliente as any)?.full_name ?? "—"}
                          </span>
                          <span className="text-xs text-neutral-400 ml-auto shrink-0">
                            {dias === 0 ? "Hoy" : `hace ${dias}d`}
                          </span>
                        </div>
                        {c.notas && (
                          <p className="text-xs text-neutral-500 truncate pl-6">{c.notas}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }
  // ── Fin dashboard vendedor ────────────────────────────────────────────

  // ── Dashboard de producción ───────────────────────────────────────────
  if (role === "produccion") {
    const db  = adminClient as any;
    const now = ahoraAR();

    const [
      { data: ordersRaw },
      { data: stockRaw },
    ] = await Promise.all([
      db.from("orders")
        .select("id, order_number, status, aprobado_at, lines:order_lines(quantity, product_snapshot)")
        .eq("channel", "b2b_mayorista")
        .in("status", ["aprobado", "enviado_prod"])
        .order("aprobado_at", { ascending: true }),

      db.from("products")
        .select("id, name, sku, stock_cajas, stock_minimo")
        .eq("is_active", true)
        .not("stock_minimo", "is", null),
    ]);

    const cola       = (ordersRaw ?? []).filter((o: any) => o.status === "aprobado");
    const preparando = (ordersRaw ?? []).filter((o: any) => o.status === "enviado_prod");
    const stockCritico = (stockRaw ?? []).filter(
      (p: any) => Number(p.stock_cajas ?? 0) <= Number(p.stock_minimo ?? 0)
    );

    function diasDesdeAprobado(iso: string | null) {
      if (!iso) return null;
      return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
    }

    return (
      <div className="p-4 md:p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-5 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-0.5 capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
          <Link href="/admin/produccion" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">En cola</p>
            <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{cola.length}</p>
            <p className="text-xs mt-1 text-neutral-400">pedido{cola.length !== 1 ? "s" : ""} sin iniciar</p>
          </Link>

          <Link href="/admin/produccion" className={`rounded-2xl border p-5 hover:border-neutral-300 transition-colors ${preparando.length > 0 ? "bg-success-bg/40 border-success/30" : "bg-white border-neutral-200"}`}>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">En preparación</p>
            <p className={`text-3xl font-semibold font-display tabular-nums ${preparando.length > 0 ? "text-success" : "text-neutral-900"}`}>
              {preparando.length}
            </p>
            <p className="text-xs mt-1 text-neutral-400">en cocina ahora</p>
          </Link>

          <Link href="/admin/cocina" className={`rounded-2xl border p-5 hover:border-neutral-300 transition-colors ${stockCritico.length > 0 ? "bg-danger-bg/40 border-danger/30" : "bg-white border-neutral-200"}`}>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Stock crítico</p>
            <p className={`text-3xl font-semibold font-display tabular-nums ${stockCritico.length > 0 ? "text-danger" : "text-neutral-900"}`}>
              {stockCritico.length}
            </p>
            <p className="text-xs mt-1 text-neutral-400">producto{stockCritico.length !== 1 ? "s" : ""} bajo mínimo</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Izquierda */}
          <div className="lg:col-span-3 space-y-4">

            {/* Stock crítico */}
            {stockCritico.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Stock crítico</p>
                  <Link href="/admin/cocina" className="text-xs text-tierra-700 hover:underline">Ver todo →</Link>
                </div>
                <ul className="divide-y divide-neutral-50">
                  {stockCritico.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3 bg-danger-bg/20">
                      <span className="size-1.5 rounded-full bg-danger shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-neutral-400 ml-2 font-mono text-xs">{p.sku}</span>
                      </p>
                      <span className="text-xs font-semibold text-danger tabular-nums">
                        {Number(p.stock_cajas ?? 0)} / {Number(p.stock_minimo)} cajas
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cola de pedidos */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Cola — pendientes de iniciar
                </p>
                <Link href="/admin/produccion" className="text-xs text-tierra-700 hover:underline">Ver todo →</Link>
              </div>
              {cola.length === 0 ? (
                <p className="px-5 py-8 text-sm text-neutral-400 text-center">Sin pedidos en cola.</p>
              ) : (
                <ul className="divide-y divide-neutral-50">
                  {cola.slice(0, 5).map((o: any) => {
                    const dias = diasDesdeAprobado(o.aprobado_at);
                    return (
                      <li key={o.id} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-semibold text-neutral-700">{o.order_number}</span>
                          {dias !== null && dias > 1 && (
                            <span className="text-xs text-warning font-medium">Aprobado hace {dias}d</span>
                          )}
                        </div>
                        <ul className="space-y-0.5">
                          {(o.lines ?? []).map((l: any, i: number) => (
                            <li key={i} className="text-xs text-neutral-500">
                              <span className="font-semibold text-neutral-700">{l.quantity}×</span>{" "}
                              {l.product_snapshot?.name ?? "Producto"}
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                  {cola.length > 5 && (
                    <li className="px-5 py-3 text-xs text-neutral-400 text-center">
                      +{cola.length - 5} más en cola
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Derecha — accesos rápidos + en preparación */}
          <div className="lg:col-span-2 space-y-4">

            {/* En preparación */}
            {preparando.length > 0 && (
              <div className="bg-white rounded-2xl border border-success/30 bg-success-bg/20 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-100">
                  <p className="text-xs font-semibold text-success uppercase tracking-wider">En preparación ahora</p>
                </div>
                <ul className="divide-y divide-neutral-50">
                  {preparando.map((o: any) => (
                    <li key={o.id} className="px-5 py-3">
                      <span className="font-mono text-xs font-semibold text-neutral-700 block mb-1">{o.order_number}</span>
                      {(o.lines ?? []).map((l: any, i: number) => (
                        <p key={i} className="text-xs text-neutral-500">
                          <span className="font-semibold text-neutral-700">{l.quantity}×</span>{" "}
                          {l.product_snapshot?.name ?? "Producto"}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Accesos rápidos */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Accesos rápidos</p>
              </div>
              <ul className="divide-y divide-neutral-50">
                {([
                  { href: "/admin/produccion",           label: "Producción",        badge: cola.length > 0 ? `${cola.length} en cola` : null, icon: IC.produccion },
                  { href: "/admin/cocina",               label: "Cocina / Stock",    badge: stockCritico.length > 0 ? `${stockCritico.length} críticos` : null, icon: IC.cocina },
                  { href: "/admin/cocina/planificador",  label: "Planificador",      badge: null, icon: IC.planificador },
                  { href: "/admin/cocina/compras",       label: "Lista de compras",  badge: null, icon: IC.compras },
                ] as { href: string; label: string; badge: string | null; icon: React.ReactNode }[]).map(({ href, label, badge, icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-400 flex items-center">{icon}</span>
                        <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{label}</span>
                        {badge && (
                          <span className="px-2 py-0.5 rounded-full bg-warning-bg text-warning text-xs font-medium">{badge}</span>
                        )}
                      </div>
                      <span className="text-neutral-300 group-hover:text-neutral-500 text-sm">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // ── Fin dashboard producción ──────────────────────────────────────────

  // ── Dashboard de distribución ─────────────────────────────────────────
  if (role === "distribucion") {
    const db  = adminClient as any;
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

    const buildQ = (status: string) => {
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

    return (
      <div className="p-4 md:p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-5 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-0.5 capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {zonaNombre && <span className="ml-2 text-neutral-300">— Zona: {zonaNombre}</span>}
          </p>
          {!zonaFiltro && (
            <p className="text-xs text-warning mt-1">Sin zona asignada — pedile al admin que configure tu zona en Staff.</p>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
          <Link href="/admin/distribucion" className={`rounded-2xl border p-5 hover:border-neutral-300 transition-colors ${enTransitoList.length > 0 ? "bg-warning-bg/40 border-warning/30" : "bg-white border-neutral-200"}`}>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">En tránsito</p>
            <p className={`text-3xl font-semibold font-display tabular-nums ${enTransitoList.length > 0 ? "text-warning" : "text-neutral-900"}`}>
              {enTransitoList.length}
            </p>
            <p className="text-xs mt-1 text-neutral-400">pendiente{enTransitoList.length !== 1 ? "s" : ""} de entrega</p>
          </Link>

          <div className={`rounded-2xl border p-5 ${entregadosHoyList.length > 0 ? "bg-success-bg/40 border-success/30" : "bg-white border-neutral-200"}`}>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Entregados hoy</p>
            <p className={`text-3xl font-semibold font-display tabular-nums ${entregadosHoyList.length > 0 ? "text-success" : "text-neutral-900"}`}>
              {entregadosHoyList.length}
            </p>
            <p className="text-xs mt-1 text-neutral-400">pedido{entregadosHoyList.length !== 1 ? "s" : ""} entregados</p>
          </div>

          <Link href="/admin/distribucion/historial" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Este mes</p>
            <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{entregasMes}</p>
            <p className="text-xs mt-1 text-neutral-400">entregas en {now.toLocaleDateString("es-AR", { month: "long" })}</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Izquierda */}
          <div className="lg:col-span-3 space-y-4">

            {/* En tránsito */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">En tránsito ahora</p>
                <Link href="/admin/distribucion" className="text-xs text-tierra-700 hover:underline">Ver todo →</Link>
              </div>
              {enTransitoList.length === 0 ? (
                <p className="px-5 py-8 text-sm text-neutral-400 text-center">Sin pedidos en tránsito.</p>
              ) : (
                <ul className="divide-y divide-neutral-50">
                  {enTransitoList.slice(0, 5).map((o: any) => {
                    const dias = o.despachado_at
                      ? Math.floor((Date.now() - new Date(o.despachado_at).getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    return (
                      <li key={o.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-800">{o.customer?.full_name ?? "—"}</p>
                          <p className="text-xs font-mono text-neutral-400">{o.order_number}</p>
                        </div>
                        {dias !== null && dias > 0 && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dias > 3 ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"}`}>
                            {dias}d
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {enTransitoList.length > 5 && (
                    <li className="px-5 py-3 text-xs text-neutral-400 text-center">+{enTransitoList.length - 5} más</li>
                  )}
                </ul>
              )}
            </div>

            {/* Entregados hoy */}
            {entregadosHoyList.length > 0 && (
              <div className="bg-white rounded-2xl border border-success/20 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-100">
                  <p className="text-xs font-semibold text-success uppercase tracking-wider">Entregados hoy</p>
                </div>
                <ul className="divide-y divide-neutral-50">
                  {entregadosHoyList.map((o: any) => (
                    <li key={o.id} className="px-5 py-3 flex items-center gap-3">
                      <span className="text-success text-sm shrink-0">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-700">{o.customer?.full_name ?? "—"}</p>
                        <ul className="flex flex-wrap gap-x-3 mt-0.5">
                          {(o.lines ?? []).map((l: any, i: number) => (
                            <li key={i} className="text-xs text-neutral-400">
                              {l.quantity}× {l.product_snapshot?.name ?? "Producto"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Derecha */}
          <div className="lg:col-span-2 space-y-4">

            {/* Evolución mensual */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Entregas por mes</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {evolucion.map((m) => (
                  <div key={m.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs capitalize ${m.current ? "font-bold text-neutral-900" : "text-neutral-500"}`}>
                        {m.label}{m.current ? " (actual)" : ""}
                      </span>
                      <span className={`text-xs tabular-nums ${m.current ? "font-bold text-tierra-700" : "font-medium text-neutral-700"}`}>
                        {m.count > 0 ? `${m.count} entregas` : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.current ? "bg-tierra-700" : "bg-tierra-300"}`}
                        style={{ width: m.count > 0 ? `${Math.round((m.count / maxMonth) * 100)}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Accesos rápidos</p>
              </div>
              <ul className="divide-y divide-neutral-50">
                {([
                  { href: "/admin/distribucion",              label: "Pendientes de entrega", badge: enTransitoList.length > 0 ? `${enTransitoList.length}` : null, icon: IC.distribucion },
                  { href: "/admin/distribucion/hoja-de-ruta", label: "Hoja de ruta hoy",  badge: null, icon: IC.zonas },
                  { href: "/admin/distribucion/historial",    label: "Historial",          badge: null, icon: IC.clock },
                ] as { href: string; label: string; badge: string | null; icon: React.ReactNode }[]).map(({ href, label, badge, icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-400 flex items-center">{icon}</span>
                        <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{label}</span>
                        {badge && (
                          <span className="px-2 py-0.5 rounded-full bg-warning-bg text-warning text-xs font-medium">{badge}</span>
                        )}
                      </div>
                      <span className="text-neutral-300 group-hover:text-neutral-500 text-sm">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    );
  }
  // ── Fin dashboard distribución ────────────────────────────────────────

  const now           = ahoraAR();
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const sixMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const db = adminClient as any;

  const cutoff3d  = new Date(Date.now() - 3  * 24 * 60 * 60 * 1000).toISOString();
  const cutoff5d  = new Date(Date.now() - 5  * 24 * 60 * 60 * 1000).toISOString();
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [
    { count: pendingOrders },
    { count: inProd },
    { data: revenueData },
    { data: prevRevenueData },
    { data: monthlyOrdersRaw },
    { data: lastOrdersRaw },
    { data: pagosPendientes },
    { data: despachosViejos },
    { data: prodAtascados },
    { data: b2cSinPago },
    { count: productosSinDatosB2B },
    { data: { users } },
    { data: ventasConVendedor },
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

    // Pagos declarados sin confirmar
    db.from("orders")
      .select("id, order_number, customer:profiles!customer_id(full_name), payment_declared_at")
      .eq("channel", "b2b_mayorista")
      .not("payment_declared_at", "is", null)
      .is("payment_confirmed_at", null),

    // Pedidos despachados hace más de 3 días sin confirmar entrega
    db.from("orders")
      .select("id, order_number, despachado_at, customer:profiles!customer_id(full_name)")
      .eq("channel", "b2b_mayorista")
      .eq("status", "despachado")
      .lt("despachado_at", cutoff3d),

    // Pedidos B2B atascados en producción (aprobados hace >5 días, aún enviado_prod)
    db.from("orders")
      .select("id, order_number, aprobado_at, customer:profiles!customer_id(full_name)")
      .eq("channel", "b2b_mayorista")
      .eq("status", "enviado_prod")
      .lt("aprobado_at", cutoff5d),

    // Pedidos B2C sin pago hace más de 48h
    db.from("orders")
      .select("id, order_number, created_at, total, guest_email")
      .eq("channel", "b2c_nacional")
      .eq("status", "pending_payment")
      .lt("created_at", cutoff48h),

    // Productos activos sin costo → no se puede calcular precio en catálogo
    db.from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .is("costo", null),

    adminClient.auth.admin.listUsers({ perPage: 1000 }),

    // Ventas del mes por cliente B2B (para ranking preventistas)
    db.from("orders")
      .select("total, customer:profiles!customer_id(vendedor_id)")
      .eq("channel", "b2b_mayorista")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", monthStart),
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
        : null;
      return { ...c, days };
    })
    .filter((c: any) => c.days === null || c.days > 15)
    .sort((a: any, b: any) => {
      if (a.days === null && b.days === null) return 0;
      if (a.days === null) return -1;
      if (b.days === null) return 1;
      return b.days - a.days;
    });

  // ── KPIs ─────────────────────────────────────────────────────────────
  const revenueTotal  = (revenueData ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
  const prevRevenue   = (prevRevenueData ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
  const revPct        = pctChange(revenueTotal, prevRevenue);

  const monthlyOrders = (monthlyOrdersRaw ?? []) as any[];
  const ordersThisMonth = monthlyOrders.filter((o) => o.created_at >= monthStart).length;
  const ordersPrevMonth = monthlyOrders.filter(
    (o) => o.created_at >= prevMonthStart && o.created_at < monthStart
  ).length;

  const totalAlerts =
    inactivos.length +
    (pendingOrders ?? 0) +
    pendingClients +
    (pagosPendientes?.length ?? 0) +
    (despachosViejos?.length ?? 0) +
    (prodAtascados?.length ?? 0) +
    (b2cSinPago?.length ?? 0) +
    (productosSinDatosB2B ?? 0);

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

  // ── Preventistas ranking ──────────────────────────────────────────────
  const vendedoresUsers = (users ?? []).filter((u: any) => u.app_metadata?.role === "vendedor");

  const vendedorSalesMap: Record<string, { total: number; orders: number }> = {};
  for (const o of (ventasConVendedor ?? []) as any[]) {
    const vid = (o.customer as any)?.vendedor_id;
    if (vid) {
      if (!vendedorSalesMap[vid]) vendedorSalesMap[vid] = { total: 0, orders: 0 };
      vendedorSalesMap[vid].total  += Number(o.total);
      vendedorSalesMap[vid].orders += 1;
    }
  }

  const preventistasRanking = vendedoresUsers
    .map((u: any) => {
      const stats    = vendedorSalesMap[u.id] ?? { total: 0, orders: 0 };
      const name     = u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "—";
      const initials = name.split(" ").slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join("");
      return { id: u.id as string, name, initials, total: stats.total, orders: stats.orders };
    })
    .filter((v: any) => v.total > 0 || v.orders > 0)
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 4);

  // ── Alertas agrupadas ─────────────────────────────────────────────────
  const inactivosCriticos = inactivos.filter((c: any) => c.days === null || c.days > 30);
  const inactivosRiesgo   = inactivos.filter((c: any) => c.days !== null && c.days > 15 && c.days <= 30);

  type AlertGrp = { dotClass: string; bgClass: string; title: string; ctx: string; href: string };
  const alertGroups: AlertGrp[] = [
    inactivosCriticos.length > 0 && {
      dotClass: "bg-danger", bgClass: "bg-danger-bg/30",
      title: `${inactivosCriticos.length} cliente${inactivosCriticos.length !== 1 ? "s" : ""} sin actividad +30d`,
      ctx: "Requieren contacto urgente",
      href: "/admin/preventista",
    },
    inactivosRiesgo.length > 0 && {
      dotClass: "bg-warning", bgClass: "bg-warning-bg/40",
      title: `${inactivosRiesgo.length} cliente${inactivosRiesgo.length !== 1 ? "s" : ""} en riesgo 15–30d`,
      ctx: "Sin actividad reciente",
      href: "/admin/preventista",
    },
    (despachosViejos?.length ?? 0) > 0 && {
      dotClass: "bg-danger", bgClass: "bg-danger-bg/30",
      title: `${despachosViejos!.length} despacho${despachosViejos!.length !== 1 ? "s" : ""} sin confirmar +3d`,
      ctx: "Confirmar entrega al cliente",
      href: "/admin/distribucion",
    },
    (prodAtascados?.length ?? 0) > 0 && {
      dotClass: "bg-warning", bgClass: "bg-warning-bg/40",
      title: `${prodAtascados!.length} pedido${prodAtascados!.length !== 1 ? "s" : ""} atrasado${prodAtascados!.length !== 1 ? "s" : ""} en producción`,
      ctx: "+5 días sin despachar",
      href: "/admin/produccion",
    },
    (pagosPendientes?.length ?? 0) > 0 && {
      dotClass: "bg-warning", bgClass: "bg-warning-bg/40",
      title: `${pagosPendientes!.length} pago${pagosPendientes!.length !== 1 ? "s" : ""} declarado${pagosPendientes!.length !== 1 ? "s" : ""} sin confirmar`,
      ctx: "Verificar transferencia",
      href: "/admin/pedidos",
    },
    (pendingOrders ?? 0) > 0 && {
      dotClass: "bg-warning", bgClass: "bg-warning-bg/40",
      title: `${pendingOrders} pedido${pendingOrders !== 1 ? "s" : ""} B2B esperando aprobación`,
      ctx: "Pendiente de pago",
      href: "/admin/pedidos",
    },
    pendingClients > 0 && {
      dotClass: "bg-success", bgClass: "bg-success-bg/30",
      title: `${pendingClients} solicitud${pendingClients !== 1 ? "es" : ""} de alta pendiente${pendingClients !== 1 ? "s" : ""}`,
      ctx: "Nuevos clientes B2B",
      href: "/admin/clientes-b2b",
    },
    (b2cSinPago?.length ?? 0) > 0 && {
      dotClass: "bg-warning", bgClass: "bg-warning-bg/40",
      title: `${b2cSinPago!.length} pedido${b2cSinPago!.length !== 1 ? "s" : ""} de tienda sin pago +48h`,
      ctx: "B2C sin confirmar",
      href: "/admin/pedidos",
    },
    (productosSinDatosB2B ?? 0) > 0 && {
      dotClass: "bg-neutral-400", bgClass: "bg-neutral-50",
      title: `${productosSinDatosB2B} producto${productosSinDatosB2B !== 1 ? "s" : ""} activo${productosSinDatosB2B !== 1 ? "s" : ""} sin precio B2B`,
      ctx: "No aparecen en catálogo",
      href: "/admin/productos",
    },
  ].filter(Boolean) as AlertGrp[];

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-5 md:mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-0.5 capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/admin/nuevo-pedido"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium shadow-sm hover:bg-tierra-600 transition-colors shrink-0">
          {IC.nuevoPedido}
          Nuevo pedido
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        {/* Ventas */}
        <Link href="/admin/reportes" className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Ventas {mesNombre}</p>
            <span className="size-8 rounded-lg bg-tierra-50 text-tierra-700 flex items-center justify-center shrink-0 group-hover:bg-tierra-100 transition-colors">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </span>
          </div>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(revenueTotal)}</p>
          {revPct !== null && (
            <p className={`text-xs mt-1.5 font-medium ${revPct >= 0 ? "text-success" : "text-danger"}`}>
              {revPct >= 0 ? "↑" : "↓"} {Math.abs(revPct)}% vs {new Date(now.getFullYear(), now.getMonth() - 1).toLocaleDateString("es-AR", { month: "long" })}
            </p>
          )}
        </Link>

        {/* Pedidos este mes */}
        <Link href="/admin/pedidos" className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Pedidos {mesNombre}</p>
            <span className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
            </span>
          </div>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{ordersThisMonth}</p>
          <p className="text-xs mt-1.5 text-neutral-400">{ordersPrevMonth} el mes anterior</p>
        </Link>

        {/* Alertas */}
        <div className={`rounded-2xl border p-5 shadow-sm ${totalAlerts > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200"}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Alertas activas</p>
            <span className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${totalAlerts > 0 ? "bg-amber-100 text-amber-600" : "bg-neutral-100 text-neutral-400"}`}>
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            </span>
          </div>
          <p className={`text-3xl font-semibold font-display tabular-nums ${totalAlerts > 0 ? "text-amber-700" : "text-neutral-900"}`}>
            {totalAlerts}
          </p>
          <p className="text-xs mt-1.5 text-neutral-400">
            {totalAlerts === 0 ? "Todo en orden" : `${alertGroups.length} grupo${alertGroups.length !== 1 ? "s" : ""} activo${alertGroups.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Clientes */}
        <Link href="/admin/clientes-b2b" className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-200 group">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Clientes activos</p>
            <span className="size-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
            </span>
          </div>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{activeClients}</p>
          <p className="text-xs mt-1.5 text-neutral-400">
            {b2bUsers.length} totales{pendingClients > 0 ? ` · ${pendingClients} pendientes` : ""}
          </p>
        </Link>
      </div>

      {/* Cuerpo — dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-4">

        {/* Columna izquierda */}
        <div className="space-y-4">

          {/* Evolución de ventas — gráfico de barras verticales */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Evolución de ventas</p>
            </div>
            <div className="px-5 pt-4 pb-4">
              <div className="flex gap-1.5">
                {monthlyEvol.map((m) => {
                  const pxH = maxMonth > 0
                    ? Math.max(Math.round((m.total / maxMonth) * 80), m.total > 0 ? 4 : 0)
                    : 0;
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-[10px] tabular-nums font-medium h-4 flex items-end justify-center ${m.current ? "text-tierra-700" : "text-neutral-400"} ${m.total === 0 ? "invisible" : ""}`}>
                        {fmtK(m.total)}
                      </span>
                      <div className="w-full flex items-end" style={{ height: "80px" }}>
                        <div
                          className={`w-full rounded-t-sm ${m.current ? "bg-tierra-700" : "bg-tierra-200"}`}
                          style={{ height: `${pxH}px` }}
                        />
                      </div>
                      <span className={`text-[10px] capitalize leading-none mt-0.5 ${m.current ? "text-tierra-700 font-semibold" : "text-neutral-400"}`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Productos más vendidos */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Productos más vendidos</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">Sin datos este mes</p>
              ) : topProducts.map(([name, total], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-neutral-300 tabular-nums w-4 shrink-0 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neutral-700 truncate max-w-[160px]" title={name}>{name}</span>
                      <span className="text-xs font-semibold text-neutral-900 tabular-nums ml-2">{fmtK(total)}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tierra-700 rounded-full"
                        style={{ width: `${Math.round((total / maxProduct) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Columna derecha */}
        <div className="space-y-4">

          {/* Requiere atención — alertas agrupadas */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Requiere atención</p>
              {totalAlerts > 0 && (
                <span className="size-5 rounded-full bg-warning flex items-center justify-center text-white text-[10px] font-bold tabular-nums leading-none">
                  {totalAlerts > 99 ? "99+" : totalAlerts}
                </span>
              )}
            </div>
            {alertGroups.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-success">Todo en orden</p>
                <p className="text-xs text-neutral-300 mt-0.5">Sin alertas activas</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {alertGroups.map((g, i) => (
                  <li key={i} className={`flex items-start gap-3 px-5 py-3.5 ${g.bgClass}`}>
                    <span className={`size-1.5 rounded-full ${g.dotClass} shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 leading-snug">{g.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{g.ctx}</p>
                    </div>
                    <Link href={g.href} className="text-xs text-tierra-700 hover:underline shrink-0 mt-0.5">
                      Ver →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Preventistas del mes */}
          {preventistasRanking.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Preventistas · <span className="normal-case capitalize">{mesNombre}</span>
                </p>
              </div>
              <ul className="divide-y divide-neutral-50">
                {preventistasRanking.map((v, i) => (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-semibold text-neutral-300 tabular-nums w-4 shrink-0 text-center">{i + 1}</span>
                    <div className="size-7 rounded-full bg-tierra-100 text-tierra-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {v.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{v.name}</p>
                      <p className="text-xs text-neutral-400">{v.orders} pedido{v.orders !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-neutral-900">{fmtK(v.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
