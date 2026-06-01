import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ahoraAR } from "@/lib/fecha";

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
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-0.5 capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                  { href: "/admin/preventista",   label: "Mis clientes", badge: totalInact > 0 ? `${totalInact} para contactar` : null, icon: "👥" },
                  { href: "/admin/pedidos/nuevo", label: "Nuevo pedido",  badge: null, icon: "📋" },
                  { href: "/admin/pedidos",       label: "Ver pedidos",   badge: (pedidosPendientes ?? 0) > 0 ? `${pedidosPendientes} pendientes` : null, icon: "📦" },
                ] as { href: string; label: string; badge: string | null; icon: string }[]).map(({ href, label, badge, icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{icon}</span>
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
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-0.5 capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
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
                  { href: "/admin/produccion",           label: "Producción",        badge: cola.length > 0 ? `${cola.length} en cola` : null, icon: "🏭" },
                  { href: "/admin/cocina",               label: "Cocina / Stock",    badge: stockCritico.length > 0 ? `${stockCritico.length} críticos` : null, icon: "🍳" },
                  { href: "/admin/cocina/planificador",  label: "Planificador",      badge: null, icon: "📅" },
                  { href: "/admin/cocina/compras",       label: "Lista de compras",  badge: null, icon: "🛒" },
                ] as { href: string; label: string; badge: string | null; icon: string }[]).map(({ href, label, badge, icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{icon}</span>
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
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-0.5 capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {zonaNombre && <span className="ml-2 text-neutral-300">— Zona: {zonaNombre}</span>}
          </p>
          {!zonaFiltro && (
            <p className="text-xs text-warning mt-1">Sin zona asignada — pedile al admin que configure tu zona en Staff.</p>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
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
                  { href: "/admin/distribucion",           label: "Pendientes de entrega", badge: enTransitoList.length > 0 ? `${enTransitoList.length}` : null, icon: "📦" },
                  { href: "/admin/distribucion/hoja-de-ruta", label: "Hoja de ruta hoy",  badge: null, icon: "🗺️" },
                  { href: "/admin/distribucion/historial",  label: "Historial",            badge: null, icon: "🕐" },
                ] as { href: string; label: string; badge: string | null; icon: string }[]).map(({ href, label, badge, icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{icon}</span>
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

    // Productos activos sin datos B2B (sin costo → no muestran precio en catálogo)
    db.from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .is("costo", null),

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
            {totalAlerts === 0
              ? "Todo en orden"
              : [
                  inactivos.length > 0 && `${inactivos.length} inactivos`,
                  (pagosPendientes?.length ?? 0) > 0 && `${pagosPendientes!.length} pagos`,
                  (despachosViejos?.length ?? 0) > 0 && `${despachosViejos!.length} despachos`,
                  (pendingOrders ?? 0) > 0 && `${pendingOrders} pendientes`,
                  (prodAtascados?.length ?? 0) > 0 && `${prodAtascados!.length} en prod`,
                  (b2cSinPago?.length ?? 0) > 0 && `${b2cSinPago!.length} B2C sin pago`,
                  (productosSinDatosB2B ?? 0) > 0 && `${productosSinDatosB2B} productos sin precio`,
                ].filter(Boolean).join(" · ")
            }
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

      {/* Widget preventista */}
      {inactivos.length > 0 && (
        <Link href="/admin/preventista"
          className="flex items-center justify-between px-5 py-4 mb-4 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 transition-colors">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Preventista</p>
              <p className="text-sm font-medium text-neutral-700 mt-0.5">
                {inactivos.filter((c: any) => c.days > 30).length > 0 && (
                  <span className="text-danger font-semibold">{inactivos.filter((c: any) => c.days > 30).length} sin comprar +30d</span>
                )}
                {inactivos.filter((c: any) => c.days > 30).length > 0 && inactivos.filter((c: any) => c.days > 15 && c.days <= 30).length > 0 && " · "}
                {inactivos.filter((c: any) => c.days > 15 && c.days <= 30).length > 0 && (
                  <span className="text-warning">{inactivos.filter((c: any) => c.days > 15 && c.days <= 30).length} en riesgo 15-30d</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {inactivos.slice(0, 4).map((c: any) => (
                <div key={c.id} className="flex items-center justify-center size-7 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600" title={c.full_name}>
                  {(c.full_name ?? "?").charAt(0).toUpperCase()}
                </div>
              ))}
              {inactivos.length > 4 && (
                <div className="flex items-center justify-center size-7 rounded-full bg-neutral-100 text-xs text-neutral-400">
                  +{inactivos.length - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-tierra-700 font-medium">Ver →</span>
          </div>
        </Link>
      )}

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
                        {c.days === null ? "sin pedidos registrados" : `sin pedir hace ${c.days} días`}
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

                {/* Pagos declarados sin confirmar */}
                {(pagosPendientes ?? []).map((o: any) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                    <span className="size-1.5 rounded-full bg-warning shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{o.customer?.full_name ?? `#${o.order_number}`}</span>{" "}
                      <span className="text-neutral-500">declaró pago — pendiente de confirmación</span>
                    </p>
                    <Link href="/admin/pedidos" className="text-xs text-tierra-700 hover:underline shrink-0">
                      Ver →
                    </Link>
                  </li>
                ))}

                {/* Despachos sin confirmar entrega (+3 días) */}
                {(despachosViejos ?? []).map((o: any) => {
                  const days = o.despachado_at
                    ? Math.floor((Date.now() - new Date(o.despachado_at).getTime()) / (1000 * 60 * 60 * 24))
                    : "?";
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3 bg-danger-bg/30">
                      <span className="size-1.5 rounded-full bg-danger shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{o.customer?.full_name ?? `#${o.order_number}`}</span>{" "}
                        <span className="text-neutral-500">despachado hace {days} días sin confirmar entrega</span>
                      </p>
                      <Link href="/admin/distribucion" className="text-xs text-tierra-700 hover:underline shrink-0">
                        Ver →
                      </Link>
                    </li>
                  );
                })}

                {/* Pedidos B2B atascados en producción (+5 días) */}
                {(prodAtascados ?? []).map((o: any) => {
                  const days = o.aprobado_at
                    ? Math.floor((Date.now() - new Date(o.aprobado_at).getTime()) / (1000 * 60 * 60 * 24))
                    : "?";
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                      <span className="size-1.5 rounded-full bg-warning shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{o.customer?.full_name ?? `#${o.order_number}`}</span>{" "}
                        <span className="text-neutral-500">en producción hace {days} días sin despachar</span>
                      </p>
                      <Link href="/admin/produccion" className="text-xs text-tierra-700 hover:underline shrink-0">
                        Ver →
                      </Link>
                    </li>
                  );
                })}

                {/* Pedidos B2C sin pago (+48h) */}
                {(b2cSinPago ?? []).map((o: any) => {
                  const hours = Math.floor((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60));
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                      <span className="size-1.5 rounded-full bg-warning shrink-0" />
                      <p className="text-sm text-neutral-800 flex-1">
                        <span className="font-semibold">{o.guest_email ?? `#${o.order_number}`}</span>{" "}
                        <span className="text-neutral-500">pedido de tienda sin pago hace {hours}h</span>
                      </p>
                      <Link href={`/admin/pedidos/${o.id}`} className="text-xs text-tierra-700 hover:underline shrink-0">
                        Ver →
                      </Link>
                    </li>
                  );
                })}

                {/* Productos sin datos B2B */}
                {(productosSinDatosB2B ?? 0) > 0 && (
                  <li className="flex items-center gap-3 px-5 py-3 bg-neutral-50">
                    <span className="size-1.5 rounded-full bg-neutral-400 shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{productosSinDatosB2B}</span>{" "}
                      <span className="text-neutral-500">producto{productosSinDatosB2B !== 1 ? "s" : ""} activo{productosSinDatosB2B !== 1 ? "s" : ""} sin precio B2B — no aparecen en el catálogo</span>
                    </p>
                    <Link href="/admin/productos" className="text-xs text-tierra-700 hover:underline shrink-0">
                      Cargar →
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
