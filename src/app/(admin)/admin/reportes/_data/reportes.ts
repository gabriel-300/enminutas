import { createAdminClient } from "@/lib/supabase/server";
import { VENTAS_STATUSES } from "@/lib/order-status";

export async function loadReportes(mes: string | undefined) {
  const now = new Date();
  const mesParam =
    mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = mesParam.split("-");
  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  const desde  = new Date(year, month - 1, 1).toISOString();
  const hasta  = new Date(year, month, 0, 23, 59, 59).toISOString();

  const prevYear  = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevDesde = new Date(prevYear, prevMonth - 1, 1).toISOString();
  const prevHasta = new Date(prevYear, prevMonth, 0, 23, 59, 59).toISOString();

  const db       = createAdminClient();

  const [
    { data: rawCur },
    { data: rawPrev },
    { data: { users: allUsers } },
    { data: rawDeuda },
  ] = await Promise.all([
    db.from("orders")
      .select(`
        id, order_number, status, total, created_at, channel,
        customer:profiles!customer_id (full_name, vendedor_id)
      `)
      .in("status", VENTAS_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta)
      .order("created_at", { ascending: false }),

    db.from("orders")
      .select("total, created_at")
      .in("status", VENTAS_STATUSES)
      .gte("created_at", prevDesde)
      .lte("created_at", prevHasta),

    db.auth.admin.listUsers({ perPage: 1000 }),

    // Deuda en cuenta corriente: pedidos no liquidados ni cancelados
    db.from("orders")
      .select(`
        id, order_number, total, created_at, status,
        customer:profiles!customer_id (id, full_name, vendedor_id)
      `)
      .eq("payment_method", "cuenta_corriente")
      .not("status", "in", '("cancelled","liquidado","pending_payment")')
      .order("created_at", { ascending: false }),
  ]);

  const rawVendedores = (allUsers ?? [])
    .filter((u: any) => u.app_metadata?.role === "vendedor")
    .map((u: any) => ({
      id:        u.id,
      full_name: u.user_metadata?.full_name ?? u.email ?? u.id,
    }));

  const orders     = (rawCur  ?? []) as any[];
  const prevOrders = (rawPrev ?? []) as any[];

  // Order lines for top products
  const orderIds = orders.map((o: any) => o.id);
  let rawLines: any[] = [];
  if (orderIds.length > 0) {
    const { data } = await db
      .from("order_lines")
      .select("product_id, quantity, unit_price, product:products!product_id (name, sku)")
      .in("order_id", orderIds);
    rawLines = data ?? [];
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const totalGeneral = orders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const totalPedidos = orders.length;
  const ticketProm   = totalPedidos > 0 ? Math.round(totalGeneral / totalPedidos) : 0;
  const canalesSet   = new Set(orders.map((o: any) => o.channel as string));
  const canalesCount = canalesSet.size;

  const prevTotal    = prevOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const prevPedidos  = prevOrders.length;

  // Daily totals for chart
  const curDayTotals  = new Array<number>(daysInMonth).fill(0);
  const prevDayTotals = new Array<number>(daysInMonth).fill(0);

  for (const o of orders) {
    const d = new Date(o.created_at).getDate() - 1;
    if (d >= 0 && d < daysInMonth) curDayTotals[d] += Number(o.total);
  }
  for (const o of prevOrders) {
    const d = new Date(o.created_at).getDate() - 1;
    if (d >= 0 && d < daysInMonth) prevDayTotals[d] += Number(o.total);
  }

  // Channel mix
  const channelMap: Record<string, { count: number; total: number }> = {};
  for (const o of orders) {
    const ch = o.channel as string;
    if (!channelMap[ch]) channelMap[ch] = { count: 0, total: 0 };
    channelMap[ch].count++;
    channelMap[ch].total += Number(o.total);
  }
  const channelMix = Object.entries(channelMap)
    .sort(([, a], [, b]) => b.total - a.total);

  // Top products
  const productMap: Record<string, { name: string; sku: string; cajas: number; total: number }> = {};
  for (const line of rawLines) {
    const pid = line.product_id;
    if (!pid) continue;
    if (!productMap[pid]) {
      productMap[pid] = {
        name:  line.product?.name ?? "—",
        sku:   line.product?.sku  ?? "—",
        cajas: 0,
        total: 0,
      };
    }
    productMap[pid].cajas += Number(line.quantity);
    productMap[pid].total += Number(line.quantity) * Number(line.unit_price ?? 0);
  }
  const topProductos = Object.values(productMap)
    .sort((a, b) => b.cajas - a.cajas)
    .slice(0, 8);

  // Ventas por vendedor
  const vendedorMap: Record<string, { nombre: string; pedidos: number; total: number }> = {};
  for (const v of rawVendedores ?? []) {
    vendedorMap[v.id] = { nombre: v.full_name ?? "Sin nombre", pedidos: 0, total: 0 };
  }
  for (const o of orders) {
    const vid = (o.customer as any)?.vendedor_id as string | undefined;
    if (vid && vendedorMap[vid]) {
      vendedorMap[vid].pedidos++;
      vendedorMap[vid].total += Number(o.total);
    }
  }
  const vendedorStats = Object.values(vendedorMap)
    .filter((v) => v.pedidos > 0)
    .sort((a, b) => b.total - a.total);

  // Deuda por vendedor (cuenta corriente no liquidada)
  const vendedorNombreMap: Record<string, string> = Object.fromEntries(
    rawVendedores.map((v: any) => [v.id, v.full_name])
  );
  type ClienteDeuda = { nombre: string; pedidos: number; total: number };
  type VendedorDeuda = { nombre: string; clientes: Record<string, ClienteDeuda>; total: number };
  const deudaMap: Record<string, VendedorDeuda> = {};
  let deudaSinVendedor = 0;

  for (const o of (rawDeuda ?? []) as any[]) {
    const clienteId  = o.customer?.id as string | undefined;
    const clienteNom = o.customer?.full_name as string | undefined ?? "—";
    const vid        = o.customer?.vendedor_id as string | undefined;
    const monto      = Number(o.total);

    if (!vid) { deudaSinVendedor += monto; continue; }

    if (!deudaMap[vid]) {
      deudaMap[vid] = {
        nombre:   vendedorNombreMap[vid] ?? "Desconocido",
        clientes: {},
        total:    0,
      };
    }
    if (clienteId) {
      if (!deudaMap[vid].clientes[clienteId]) {
        deudaMap[vid].clientes[clienteId] = { nombre: clienteNom, pedidos: 0, total: 0 };
      }
      deudaMap[vid].clientes[clienteId].pedidos++;
      deudaMap[vid].clientes[clienteId].total += monto;
    }
    deudaMap[vid].total += monto;
  }
  const deudaStats = Object.values(deudaMap).sort((a, b) => b.total - a.total);
  const deudaTotal = deudaStats.reduce((s, v) => s + v.total, 0) + deudaSinVendedor;

  // Recent orders table (max 20)
  const recentOrders = orders.slice(0, 20);

  // Month label
  const mesNombre = new Date(year, month - 1, 1)
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return { mesParam, daysInMonth, totalGeneral, totalPedidos, ticketProm, canalesSet, canalesCount, prevTotal, prevPedidos, curDayTotals, prevDayTotals, channelMix, topProductos, vendedorStats, deudaSinVendedor, deudaStats, deudaTotal, recentOrders, mesNombre };
}
