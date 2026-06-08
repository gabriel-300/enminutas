import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportesFilter } from "@/components/admin/reportes-filter";

export const metadata: Metadata = { title: "Reportes — Admin En Minutas" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return fmt(n);
};

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered"];

function pctDelta(cur: number, prev: number) {
  if (prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function DeltaBadge({ cur, prev }: { cur: number; prev: number }) {
  const d = pctDelta(cur, prev);
  if (d === null) return null;
  return (
    <span className={`text-xs font-medium ${d >= 0 ? "text-green-600" : "text-red-500"}`}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d)}%
    </span>
  );
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;

  const now = new Date();
  const mesParam = sp.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = mesParam.split("-");
  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const desde = new Date(year, month - 1, 1).toISOString();
  const hasta = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Mes anterior
  const prevYear  = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevDesde = new Date(prevYear, prevMonth - 1, 1).toISOString();
  const prevHasta = new Date(prevYear, prevMonth, 0, 23, 59, 59).toISOString();

  const supabase    = await createClient();
  const db          = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin");

  const [
    { data: rawB2B },
    { data: rawB2C },
    { data: rawOrderIds },
    { data: prevB2B },
    { data: prevB2C },
    { data: rawVendedores },
    { data: rawMetas },
  ] = await Promise.all([
    // Pedidos B2B del mes
    db.from("orders")
      .select(`
        id, order_number, status, total, created_at, delivery_zone_id,
        zona:delivery_zones!delivery_zone_id (name),
        customer:profiles!customer_id (full_name, vendedor_id)
      `)
      .eq("channel", "b2b_mayorista")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta)
      .order("created_at", { ascending: false }),

    // Pedidos B2C del mes
    db.from("orders")
      .select("id, total, created_at")
      .eq("channel", "b2c_nacional")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta),

    // IDs del mes para líneas de productos
    db.from("orders")
      .select("id")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta),

    // Totales mes anterior — solo para comparativa
    db.from("orders").select("total")
      .eq("channel", "b2b_mayorista").in("status", ACTIVE_STATUSES)
      .gte("created_at", prevDesde).lte("created_at", prevHasta),

    db.from("orders").select("total")
      .eq("channel", "b2c_nacional").in("status", ACTIVE_STATUSES)
      .gte("created_at", prevDesde).lte("created_at", prevHasta),

    // Vendedores (para cruzar con pedidos)
    db.from("profiles")
      .select("id, full_name")
      .eq("role", "vendedor")
      .order("full_name"),

    // Metas del mes seleccionado
    db.from("sales_goals")
      .select("vendedor_id, objetivo")
      .eq("mes", mesParam),
  ]);

  // Líneas de productos
  const orderIds = (rawOrderIds ?? []).map((o: any) => o.id);
  let rawLines: any[] = [];
  if (orderIds.length > 0) {
    const { data } = await db
      .from("order_lines")
      .select("product_id, quantity, unit_price, product:products!product_id (name, sku)")
      .in("order_id", orderIds);
    rawLines = data ?? [];
  }

  // ── Totales ────────────────────────────────────────────────────────────────
  const b2bOrders   = (rawB2B ?? []) as any[];
  const b2cOrders   = (rawB2C ?? []) as any[];
  const vendedores  = (rawVendedores ?? []) as { id: string; full_name: string }[];
  const metasMap    = Object.fromEntries(((rawMetas ?? []) as any[]).map((m: any) => [m.vendedor_id, Number(m.objetivo)]));

  const totalB2B    = b2bOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalB2C    = b2cOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalGeneral = totalB2B + totalB2C;
  const totalPedidos = b2bOrders.length + b2cOrders.length;
  const ticketProm  = totalPedidos > 0 ? Math.round(totalGeneral / totalPedidos) : 0;

  const prevTotalB2B = ((prevB2B ?? []) as any[]).reduce((s, o) => s + Number(o.total), 0);
  const prevTotalB2C = ((prevB2C ?? []) as any[]).reduce((s, o) => s + Number(o.total), 0);
  const prevTotal    = prevTotalB2B + prevTotalB2C;

  // ── Por zona ───────────────────────────────────────────────────────────────
  const zonaMap: Record<string, { name: string; count: number; total: number }> = {};
  for (const o of b2bOrders) {
    const zonaNombre = (o.zona as any)?.name ?? "Sin zona";
    if (!zonaMap[zonaNombre]) zonaMap[zonaNombre] = { name: zonaNombre, count: 0, total: 0 };
    zonaMap[zonaNombre].count++;
    zonaMap[zonaNombre].total += Number(o.total);
  }
  const porZona = Object.values(zonaMap).sort((a, b) => b.total - a.total);

  // ── Por vendedor ───────────────────────────────────────────────────────────
  const vendedorMap: Record<string, { name: string; count: number; total: number; objetivo: number }> = {};
  for (const v of vendedores) {
    vendedorMap[v.id] = { name: v.full_name, count: 0, total: 0, objetivo: metasMap[v.id] ?? 0 };
  }
  for (const o of b2bOrders) {
    const vid = (o.customer as any)?.vendedor_id;
    if (vid && vendedorMap[vid]) {
      vendedorMap[vid].count++;
      vendedorMap[vid].total += Number(o.total);
    }
  }
  const porVendedor = Object.values(vendedorMap)
    .filter((v) => v.count > 0 || v.objetivo > 0)
    .sort((a, b) => b.total - a.total);

  // ── Top clientes ───────────────────────────────────────────────────────────
  const clientMap: Record<string, { name: string; count: number; total: number }> = {};
  for (const o of b2bOrders) {
    const name = (o.customer as any)?.full_name ?? "—";
    if (!clientMap[name]) clientMap[name] = { name, count: 0, total: 0 };
    clientMap[name].count++;
    clientMap[name].total += Number(o.total);
  }
  const topClientes = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 10);

  // ── Top productos ──────────────────────────────────────────────────────────
  const productMap: Record<string, { name: string; sku: string; cajas: number; total: number }> = {};
  for (const line of rawLines) {
    const pid = line.product_id;
    if (!pid) continue;
    if (!productMap[pid]) productMap[pid] = {
      name:  line.product?.name ?? "—",
      sku:   line.product?.sku  ?? "—",
      cajas: 0,
      total: 0,
    };
    productMap[pid].cajas += Number(line.quantity);
    productMap[pid].total += Number(line.quantity) * Number(line.unit_price ?? 0);
  }
  const topProductos = Object.values(productMap).sort((a, b) => b.cajas - a.cajas).slice(0, 10);

  const mesNombre = new Date(year, month - 1, 1)
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-8 max-w-6xl">

      {/* Header */}
      <div className="mb-5 md:mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900 capitalize">
            {mesNombre}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">Pedidos confirmados — todos los canales</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReportesFilter mes={mesParam} />
          <a href={`/api/admin/export/pedidos?mes=${mesParam}`} download
            className="px-3 py-1.5 text-xs font-medium bg-tierra-700 text-white rounded-lg hover:bg-tierra-800 transition-colors">
            ↓ CSV mes
          </a>
          <a href="/api/admin/export/pedidos" download
            className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
            ↓ Histórico
          </a>
          {["dist", "gastro", "min"].map((c) => (
            <a key={c} href={`/admin/reportes/precios?canal=${c}`} download
              className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
              Precios {c === "dist" ? "Dist" : c === "gastro" ? "Gastro" : "Min"} ↓
            </a>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        {[
          { label: "Total del mes", value: totalGeneral, prev: prevTotal, sub: `${totalPedidos} pedido${totalPedidos !== 1 ? "s" : ""}`, highlight: true },
          { label: "B2B Mayorista", value: totalB2B,    prev: prevTotalB2B, sub: `${b2bOrders.length} pedidos` },
          { label: "Tienda online", value: totalB2C,    prev: prevTotalB2C, sub: `${b2cOrders.length} pedidos` },
          { label: "Ticket promedio", value: ticketProm, prev: 0, sub: "por pedido" },
        ].map(({ label, value, prev, sub, highlight }) => (
          <div key={label} className="bg-white rounded-2xl border border-neutral-200 p-4 md:p-5">
            <p className="text-xs text-neutral-400 mb-1">{label}</p>
            <p className={`text-xl md:text-2xl font-semibold font-display tabular-nums ${highlight ? "text-tierra-700" : "text-neutral-900"}`}>
              {fmtK(value)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-neutral-400">{sub}</p>
              {prev > 0 && <DeltaBadge cur={value} prev={prev} />}
            </div>
          </div>
        ))}
      </div>

      {totalGeneral === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">Sin pedidos confirmados en este período.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Fila: Top productos + Por zona */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Top productos */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700">Productos más pedidos</p>
              </div>
              {topProductos.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-neutral-400">Sin datos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 text-left">
                        <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                        <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Cajas</th>
                        <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {topProductos.map((p, i) => (
                        <tr key={p.sku} className="hover:bg-neutral-50">
                          <td className="px-5 py-2.5">
                            <span className="text-neutral-300 mr-1.5 text-xs tabular-nums">#{i + 1}</span>
                            <span className="font-medium text-neutral-800">{p.name}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right font-semibold text-neutral-900 tabular-nums">{p.cajas}</td>
                          <td className="px-5 py-2.5 text-right text-neutral-500 tabular-nums text-xs">{fmtK(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Por zona */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700">Ventas por zona de entrega</p>
              </div>
              {porZona.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-neutral-400">Sin datos</p>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {porZona.map((z) => {
                    const pct = totalB2B > 0 ? Math.round((z.total / totalB2B) * 100) : 0;
                    return (
                      <div key={z.name} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-neutral-800 truncate">{z.name}</span>
                            <span className="text-sm font-semibold tabular-nums text-neutral-900 ml-2 shrink-0">{fmtK(z.total)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
                              <div className="bg-tierra-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-neutral-400 tabular-nums w-8 text-right">{pct}%</span>
                            <span className="text-xs text-neutral-400">{z.count} ped.</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ventas por vendedor + metas */}
          {porVendedor.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700">Rendimiento por vendedor</p>
                <p className="text-xs text-neutral-400 mt-0.5 capitalize">Vs meta de {mesNombre}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400">Vendedor</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Pedidos</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Vendido</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Meta</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400">Avance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {porVendedor.map((v) => {
                      const pct = v.objetivo > 0 ? Math.min(Math.round((v.total / v.objetivo) * 100), 100) : null;
                      return (
                        <tr key={v.name} className="hover:bg-neutral-50">
                          <td className="px-5 py-3 font-medium text-neutral-800">{v.name}</td>
                          <td className="px-5 py-3 text-right text-neutral-500">{v.count}</td>
                          <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmtK(v.total)}</td>
                          <td className="px-5 py-3 text-right text-neutral-400 tabular-nums">
                            {v.objetivo > 0 ? fmtK(v.objetivo) : <span className="text-neutral-200">—</span>}
                          </td>
                          <td className="px-5 py-3 w-36">
                            {pct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-tierra-600" : "bg-yellow-400"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium tabular-nums w-8 text-right ${pct >= 100 ? "text-green-600" : "text-neutral-500"}`}>
                                  {pct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-neutral-300">Sin meta</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top clientes */}
          {topClientes.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700">Top clientes B2B</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400">Cliente</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Pedidos</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Ticket prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {topClientes.map((c, i) => (
                      <tr key={c.name} className="hover:bg-neutral-50">
                        <td className="px-5 py-2.5 font-medium text-neutral-800">
                          <span className="text-neutral-300 mr-2 tabular-nums text-xs">#{i + 1}</span>
                          {c.name}
                        </td>
                        <td className="px-5 py-2.5 text-right text-neutral-500">{c.count}</td>
                        <td className="px-5 py-2.5 text-right font-semibold text-neutral-900 tabular-nums">{fmtK(c.total)}</td>
                        <td className="px-5 py-2.5 text-right text-neutral-400 tabular-nums">{fmtK(Math.round(c.total / c.count))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
