import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportesFilter } from "@/components/admin/reportes-filter";
import { ExportDropdown } from "@/components/admin/export-dropdown";

export const metadata: Metadata = { title: "Reportes — Admin En Minutas" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return fmt(n);
};

const ACTIVE_STATUSES = [
  "aprobado", "enviado_prod", "despachado", "en_distribucion",
  "entrega_parcial", "delivered", "liquidado",
];

const CHANNEL_CFG: Record<string, { label: string; bg: string; color: string; bar: string }> = {
  b2b_mayorista: { label: "B2B",         bg: "#eef2f7", color: "#16233f", bar: "#16233f" },
  b2c_nacional:  { label: "Online",      bg: "#e8f0fb", color: "#2f5fd0", bar: "#2f5fd0" },
  distribucion:  { label: "Distribución",bg: "#e6f3ef", color: "#1f7a52", bar: "#1f7a52" },
  gastronomia:   { label: "Gastronomía", bg: "#fbf1e4", color: "#b25e09", bar: "#b25e09" },
};

const STATUS_LABELS: Record<string, string> = {
  aprobado:        "Aprobado",
  enviado_prod:    "En producción",
  despachado:      "Despachado",
  en_distribucion: "En distribución",
  entrega_parcial: "Parcial",
  delivered:       "Entregado",
  liquidado:       "Liquidado",
};

// ── SVG Chart ────────────────────────────────────────────────────────────────

function DailySalesChart({
  curSeries,
  prevSeries,
  daysInMonth,
}: {
  curSeries: number[];
  prevSeries: number[];
  daysInMonth: number;
}) {
  const W = 620, H = 108, PL = 2, PR = 2, PT = 6, PB = 2;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const maxVal = Math.max(...curSeries, ...prevSeries, 1);

  const xp = (i: number) => PL + (i / Math.max(daysInMonth - 1, 1)) * cW;
  const yp = (v: number) => PT + cH - (v / maxVal) * cH;

  const mkPts = (s: number[]) =>
    s.slice(0, daysInMonth).map((v, i) => `${xp(i)},${yp(v)}`).join(" ");

  const mkArea = (s: number[]) => {
    const inner = s.slice(0, daysInMonth).map((v, i) => `${xp(i)},${yp(v)}`).join(" ");
    return `${xp(0)},${PT + cH} ${inner} ${xp(daysInMonth - 1)},${PT + cH}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} aria-hidden>
      <defs>
        <linearGradient id="rpt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16233f" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#16233f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={mkArea(curSeries)} fill="url(#rpt-grad)" />
      <polyline
        points={mkPts(prevSeries)}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <polyline
        points={mkPts(curSeries)}
        fill="none"
        stroke="#16233f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Channel pill ─────────────────────────────────────────────────────────────

function ChannelPill({ channel }: { channel: string }) {
  const c = CHANNEL_CFG[channel] ?? { label: channel, bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium leading-tight whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ── Delta badge ───────────────────────────────────────────────────────────────

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0) return null;
  const d = Math.round(((cur - prev) / prev) * 100);
  return (
    <span className={`text-xs font-medium ${d >= 0 ? "text-emerald-600" : "text-red-500"}`}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d)}%
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;

  const now = new Date();
  const mesParam =
    sp.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

  const supabase = await createClient();
  const db       = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin");

  const [
    { data: rawCur },
    { data: rawPrev },
  ] = await Promise.all([
    db.from("orders")
      .select(`
        id, order_number, status, total, created_at, channel,
        customer:profiles!customer_id (full_name)
      `)
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desde)
      .lte("created_at", hasta)
      .order("created_at", { ascending: false }),

    db.from("orders")
      .select("total, created_at")
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", prevDesde)
      .lte("created_at", prevHasta),
  ]);

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

  // Recent orders table (max 20)
  const recentOrders = orders.slice(0, 20);

  // Month label
  const mesNombre = new Date(year, month - 1, 1)
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-6xl">

      {/* ── Header ── */}
      <div className="mb-5 md:mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-[#16233f] capitalize">
            {mesNombre}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#8693a8" }}>
            Pedidos confirmados — todos los canales
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReportesFilter mes={mesParam} />
          <ExportDropdown mesParam={mesParam} />
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        {[
          {
            label: "Total del mes",
            value: fmtK(totalGeneral),
            sub: `${totalPedidos} pedido${totalPedidos !== 1 ? "s" : ""}`,
            delta: <Delta cur={totalGeneral} prev={prevTotal} />,
            highlight: true,
          },
          {
            label: "Ticket promedio",
            value: fmtK(ticketProm),
            sub: "por pedido",
            delta: null,
          },
          {
            label: "Pedidos confirmados",
            value: String(totalPedidos),
            sub: "este período",
            delta: <Delta cur={totalPedidos} prev={prevPedidos} />,
          },
          {
            label: "Canales activos",
            value: String(canalesCount),
            sub: canalesCount === 0 ? "—" : [...canalesSet].map((c) => CHANNEL_CFG[c]?.label ?? c).join(", "),
            delta: null,
          },
        ].map(({ label, value, sub, delta, highlight }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-4 md:p-5"
            style={{ border: "1px solid #e7ecf3", boxShadow: "0 1px 2px rgba(22,35,63,.04)" }}
          >
            <p className="text-xs mb-1" style={{ color: "#8693a8" }}>{label}</p>
            <p
              className={`text-xl md:text-2xl font-semibold font-display tabular-nums ${highlight ? "text-tierra-700" : ""}`}
              style={highlight ? undefined : { color: "#16233f" }}
            >
              {value}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs truncate" style={{ color: "#8693a8" }}>{sub}</p>
              {delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div
        className="bg-white rounded-2xl mb-4 overflow-hidden"
        style={{ border: "1px solid #e7ecf3", boxShadow: "0 1px 2px rgba(22,35,63,.04)" }}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: "#16233f" }}>
            Ventas diarias
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "#8693a8" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5 rounded" style={{ background: "#16233f" }} />
              Este mes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 rounded" style={{ height: 1.5, background: "#cbd5e1", borderTop: "1.5px dashed #cbd5e1" }} />
              Mes anterior
            </span>
          </div>
        </div>
        <div className="px-4 pb-4">
          <DailySalesChart
            curSeries={curDayTotals}
            prevSeries={prevDayTotals}
            daysInMonth={daysInMonth}
          />
          {/* Day labels */}
          <div className="flex justify-between mt-1 px-0.5">
            {[1, Math.ceil(daysInMonth / 4), Math.ceil(daysInMonth / 2), Math.ceil(daysInMonth * 3 / 4), daysInMonth].map((d) => (
              <span key={d} className="text-xs tabular-nums" style={{ color: "#8693a8" }}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      {totalPedidos === 0 ? (
        <div
          className="bg-white rounded-2xl p-12 text-center"
          style={{ border: "1px solid #e7ecf3" }}
        >
          <p className="text-sm" style={{ color: "#8693a8" }}>Sin pedidos confirmados en este período.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: orders table */}
          <div
            className="lg:col-span-2 bg-white rounded-2xl overflow-hidden"
            style={{ border: "1px solid #e7ecf3", boxShadow: "0 1px 2px rgba(22,35,63,.04)" }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "#e7ecf3" }}>
              <p className="text-sm font-medium" style={{ color: "#16233f" }}>Pedidos confirmados</p>
              <p className="text-xs mt-0.5" style={{ color: "#8693a8" }}>Últimos {recentOrders.length} — todos los canales</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: "#e7ecf3" }}>
                    <th className="px-4 py-3 text-xs font-medium" style={{ color: "#8693a8" }}>#</th>
                    <th className="px-4 py-3 text-xs font-medium" style={{ color: "#8693a8" }}>Cliente</th>
                    <th className="px-4 py-3 text-xs font-medium" style={{ color: "#8693a8" }}>Canal</th>
                    <th className="px-4 py-3 text-xs font-medium" style={{ color: "#8693a8" }}>Estado</th>
                    <th className="px-4 py-3 text-xs font-medium text-right" style={{ color: "#8693a8" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o: any, i: number) => (
                    <tr
                      key={o.id}
                      className="border-b hover:bg-neutral-50 transition-colors"
                      style={{ borderColor: i < recentOrders.length - 1 ? "#eef2f6" : "transparent" }}
                    >
                      <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: "#8693a8" }}>
                        {o.order_number ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium truncate max-w-[140px]" style={{ color: "#16233f" }}>
                        {(o.customer as any)?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <ChannelPill channel={o.channel} />
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "#8693a8" }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums" style={{ color: "#16233f" }}>
                        {fmtK(Number(o.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Channel mix */}
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1px solid #e7ecf3", boxShadow: "0 1px 2px rgba(22,35,63,.04)" }}
            >
              <div className="px-5 py-4 border-b" style={{ borderColor: "#e7ecf3" }}>
                <p className="text-sm font-medium" style={{ color: "#16233f" }}>Mix de canales</p>
              </div>
              <div className="px-5 py-3 space-y-3">
                {channelMix.map(([ch, data]) => {
                  const pct = totalGeneral > 0 ? Math.round((data.total / totalGeneral) * 100) : 0;
                  const cfg = CHANNEL_CFG[ch];
                  return (
                    <div key={ch}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: "#16233f" }}>
                          {cfg?.label ?? ch}
                        </span>
                        <span className="text-sm tabular-nums font-semibold" style={{ color: "#16233f" }}>
                          {fmtK(data.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full h-1.5" style={{ background: "#eef2f6" }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: cfg?.bar ?? "#16233f" }}
                          />
                        </div>
                        <span className="text-xs w-9 text-right tabular-nums" style={{ color: "#8693a8" }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top products */}
            {topProductos.length > 0 && (
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid #e7ecf3", boxShadow: "0 1px 2px rgba(22,35,63,.04)" }}
              >
                <div className="px-5 py-4 border-b" style={{ borderColor: "#e7ecf3" }}>
                  <p className="text-sm font-medium" style={{ color: "#16233f" }}>Top productos</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8693a8" }}>Por cajas vendidas</p>
                </div>
                <div className="divide-y" style={{ borderColor: "#eef2f6" }}>
                  {topProductos.map((p, i) => (
                    <div key={p.sku} className="px-5 py-2.5 flex items-center gap-3">
                      <span
                        className="text-xs tabular-nums w-5 shrink-0 text-right font-medium"
                        style={{ color: "#8693a8" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#16233f" }}>
                          {p.name}
                        </p>
                        <p className="text-xs" style={{ color: "#8693a8" }}>{p.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums" style={{ color: "#16233f" }}>
                          {p.cajas}
                        </p>
                        <p className="text-xs tabular-nums" style={{ color: "#8693a8" }}>cajas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
