import { createAdminClient } from "@/lib/supabase/server";
import { ahoraAR } from "@/lib/fecha";
import { pctChange } from "../_lib/helpers";
import { VENTAS_STATUSES } from "@/lib/order-status";

export async function loadAdminDashboard() {
  const adminClient = createAdminClient();
  const now           = ahoraAR();
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const sixMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const db = adminClient;

  const cutoff3d  = new Date(Date.now() - 3  * 24 * 60 * 60 * 1000).toISOString();
  const cutoff5d  = new Date(Date.now() - 5  * 24 * 60 * 60 * 1000).toISOString();
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [
    { count: pendingOrders },
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

    // Facturación este mes
    db.from("orders").select("total")
      .eq("channel", "b2b_mayorista").in("status", VENTAS_STATUSES)
      .gte("created_at", monthStart),

    // Facturación mes anterior
    db.from("orders").select("total")
      .eq("channel", "b2b_mayorista").in("status", VENTAS_STATUSES)
      .gte("created_at", prevMonthStart).lt("created_at", monthStart),

    // Pedidos activos últimos 6 meses (para evolución + top productos)
    db.from("orders")
      .select("id, total, created_at, lines:order_lines(line_total, product_snapshot)")
      .eq("channel", "b2b_mayorista").in("status", VENTAS_STATUSES)
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

    // Ventas del mes por cliente B2B (para ranking preventistas + desglose por cliente)
    db.from("orders")
      .select("total, customer:profiles!customer_id(id, full_name, vendedor_id)")
      .eq("channel", "b2b_mayorista")
      .in("status", VENTAS_STATUSES)
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

  // ── Preventistas ranking (con/sin IVA + desglose por cliente) ──────────
  // Mismo criterio que el resto de la app: sin IVA ≈ total (c/IVA) ÷ 1.21
  const IVA_DIV = 1.21;
  const vendedoresUsers = (users ?? []).filter((u: any) => u.app_metadata?.role === "vendedor");

  type ClienteStat = { id: string; name: string; total: number; orders: number };
  const vendedorSalesMap: Record<string, { total: number; orders: number; clientes: Record<string, ClienteStat> }> = {};
  for (const o of (ventasConVendedor ?? []) as any[]) {
    const cust = o.customer as any;
    const vid  = cust?.vendedor_id;
    if (!vid) continue;
    if (!vendedorSalesMap[vid]) vendedorSalesMap[vid] = { total: 0, orders: 0, clientes: {} };
    vendedorSalesMap[vid].total  += Number(o.total);
    vendedorSalesMap[vid].orders += 1;

    const cid = cust?.id;
    if (cid) {
      if (!vendedorSalesMap[vid].clientes[cid]) {
        vendedorSalesMap[vid].clientes[cid] = { id: cid, name: cust?.full_name ?? "—", total: 0, orders: 0 };
      }
      vendedorSalesMap[vid].clientes[cid].total  += Number(o.total);
      vendedorSalesMap[vid].clientes[cid].orders += 1;
    }
  }

  const preventistasRanking = vendedoresUsers
    .map((u: any) => {
      const stats    = vendedorSalesMap[u.id] ?? { total: 0, orders: 0, clientes: {} };
      const name     = u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "—";
      const initials = name.split(" ").slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join("");
      const clientes = Object.values(stats.clientes).sort((a, b) => b.total - a.total);
      return { id: u.id as string, name, initials, total: stats.total, orders: stats.orders, clientes };
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

  return { now, b2bUsers, pendingClients, activeClients, revenueTotal, revPct, ordersThisMonth, ordersPrevMonth, totalAlerts, topProducts, maxProduct, monthlyEvol, maxMonth, mesNombre, IVA_DIV, preventistasRanking, alertGroups };
}
