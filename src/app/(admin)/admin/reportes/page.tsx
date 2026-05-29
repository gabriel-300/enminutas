import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportesFilter } from "@/components/admin/reportes-filter";

export const metadata: Metadata = { title: "Reportes — Admin En Minutas" };
export const revalidate = 0;

const CANAL_LABEL: Record<string, string> = {
  b2b_mayorista: "B2B Mayorista",
  b2c_nacional:  "Tienda online",
  dist:          "Distribuidor",
  gastro:        "Gastronomía",
  min:           "Minorista",
  sin_canal:     "Sin canal",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered"];

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;

  // Período seleccionado
  const now = new Date();
  const mesParam = sp.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = mesParam.split("-");
  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const desde = new Date(year, month - 1, 1).toISOString();
  const hasta = new Date(year, month, 0, 23, 59, 59).toISOString();

  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pedidos del período filtrado
  const [{ data: rawB2B }, { data: rawB2C }, { data: rawOrderIds }] = await Promise.all([
    adminClient
      .from("orders")
      .select(`
        id, order_number, status, total, ideaia_commission_amount, created_at,
        customer:profiles!customer_id (full_name, canal)
      `)
      .eq("channel", "b2b_mayorista")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta)
      .order("created_at", { ascending: false }),

    adminClient
      .from("orders")
      .select("id, total, created_at")
      .eq("channel", "b2c_nacional")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta),

    // IDs de órdenes del período para luego sacar líneas
    adminClient
      .from("orders")
      .select("id")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta),
  ]);

  // Top productos: líneas de los pedidos del período
  const orderIds = (rawOrderIds ?? []).map((o: any) => o.id);
  let rawLines: any[] = [];
  if (orderIds.length > 0) {
    const { data } = await adminClient
      .from("order_lines")
      .select("product_id, quantity, unit_price, product:products!product_id (name, sku)")
      .in("order_id", orderIds);
    rawLines = data ?? [];
  }

  // ── Procesar pedidos ───────────────────────────────────────────────────────
  type B2BOrder = { id: string; order_number: string; total: number; commission: number; created_at: string; clientName: string; clientCanal: string };
  type B2COrder = { total: number; created_at: string };

  const b2bOrders: B2BOrder[] = (rawB2B ?? []).map((o: any) => ({
    id:           o.id,
    order_number: o.order_number,
    total:        Number(o.total),
    commission:   Number(o.ideaia_commission_amount ?? 0),
    created_at:   o.created_at,
    clientName:   o.customer?.full_name ?? "—",
    clientCanal:  o.customer?.canal ?? "sin_canal",
  }));

  const b2cOrders: B2COrder[] = (rawB2C ?? []).map((o: any) => ({
    total:      Number(o.total),
    created_at: o.created_at,
  }));

  // ── KPIs del mes ──────────────────────────────────────────────────────────
  const totalB2B      = b2bOrders.reduce((s, o) => s + o.total, 0);
  const totalB2C      = b2cOrders.reduce((s, o) => s + o.total, 0);
  const totalGeneral  = totalB2B + totalB2C;
  const totalComision = b2bOrders.reduce((s, o) => s + o.commission, 0);
  const totalPedidos  = b2bOrders.length + b2cOrders.length;

  // ── Por canal B2B ─────────────────────────────────────────────────────────
  const byCanalMap: Record<string, { count: number; total: number }> = {};
  for (const o of b2bOrders) {
    const k = o.clientCanal;
    if (!byCanalMap[k]) byCanalMap[k] = { count: 0, total: 0 };
    byCanalMap[k].count++;
    byCanalMap[k].total += o.total;
  }

  // ── Top clientes B2B ──────────────────────────────────────────────────────
  const clientMap: Record<string, { name: string; count: number; total: number }> = {};
  for (const o of b2bOrders) {
    if (!clientMap[o.clientName]) clientMap[o.clientName] = { name: o.clientName, count: 0, total: 0 };
    clientMap[o.clientName].count++;
    clientMap[o.clientName].total += o.total;
  }
  const topClientes = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 8);

  // ── Top productos ─────────────────────────────────────────────────────────
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

  const keyMesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="p-8 max-w-5xl">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Reportes</h1>
          <p className="text-sm text-neutral-500 mt-1">Ventas confirmadas — todos los canales</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReportesFilter mes={mesParam} />
          <span className="text-neutral-200 text-xs hidden sm:block">|</span>
          <a href={`/api/admin/export/pedidos?mes=${mesParam}`} download
            className="px-3 py-1.5 text-xs font-medium bg-tierra-700 text-white rounded-lg hover:bg-tierra-800 transition-colors">
            ↓ CSV del mes
          </a>
          <a href="/api/admin/export/pedidos" download
            className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
            ↓ Histórico
          </a>
          <span className="text-neutral-200 text-xs hidden sm:block">|</span>
          <p className="text-xs text-neutral-400">Precios:</p>
          {["dist", "gastro", "min"].map((c) => (
            <a key={c} href={`/admin/reportes/precios?canal=${c}`} download
              className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors">
              {c === "dist" ? "Dist." : c === "gastro" ? "Gastro." : "Min."} CSV
            </a>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Total del mes</p>
          <p className="text-2xl font-semibold font-display text-tierra-700">{fmt(totalGeneral)}</p>
          <p className="text-xs text-neutral-400 mt-1">{totalPedidos} pedido{totalPedidos !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">B2B Mayorista</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalB2B)}</p>
          <p className="text-xs text-neutral-400 mt-1">{b2bOrders.length} pedidos</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Tienda online</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalB2C)}</p>
          <p className="text-xs text-neutral-400 mt-1">{b2cOrders.length} pedidos</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Ticket promedio</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">
            {totalPedidos > 0 ? fmt(Math.round(totalGeneral / totalPedidos)) : "—"}
          </p>
          <p className="text-xs text-neutral-400 mt-1">por pedido</p>
        </div>
      </div>

      {totalGeneral === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">Sin pedidos confirmados en este período.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Top productos + Canal B2B */}
          <div className="grid grid-cols-2 gap-4">

            {/* Top productos */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700">Productos más pedidos</p>
              </div>
              {topProductos.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-neutral-400">Sin datos</p>
              ) : (
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
                        <td className="px-5 py-3">
                          <span className="text-neutral-300 mr-1.5 text-xs tabular-nums">#{i + 1}</span>
                          <span className="font-medium text-neutral-800">{p.name}</span>
                          <span className="text-xs text-neutral-400 font-mono ml-1.5">{p.sku}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{p.cajas}</td>
                        <td className="px-5 py-3 text-right text-neutral-600 tabular-nums">{fmt(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Canal B2B */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700">B2B por tipo de cliente</p>
              </div>
              {Object.keys(byCanalMap).length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-neutral-400">Sin datos</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400">Canal</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Pedidos</th>
                      <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {Object.entries(byCanalMap)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([canal, data]) => (
                        <tr key={canal}>
                          <td className="px-5 py-3 font-medium text-neutral-800">{CANAL_LABEL[canal] ?? canal}</td>
                          <td className="px-5 py-3 text-right text-neutral-500">{data.count}</td>
                          <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(data.total)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Top clientes B2B */}
          {topClientes.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700">Top clientes B2B</p>
              </div>
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
                      <td className="px-5 py-3 font-medium text-neutral-800">
                        <span className="text-neutral-300 mr-2 tabular-nums text-xs">#{i + 1}</span>
                        {c.name}
                      </td>
                      <td className="px-5 py-3 text-right text-neutral-500">{c.count}</td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(c.total)}</td>
                      <td className="px-5 py-3 text-right text-neutral-500 tabular-nums">{fmt(Math.round(c.total / c.count))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Comisión Ideaia */}
          {totalComision > 0 && (
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Comisión Ideaia</p>
                <p className="text-xs text-neutral-400 mt-0.5">15% sobre ventas B2B</p>
              </div>
              <p className="text-2xl font-semibold font-display text-neutral-900 tabular-nums">{fmt(totalComision)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
