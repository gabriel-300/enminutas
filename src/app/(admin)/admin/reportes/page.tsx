import { fmt, fmtK } from "@/lib/format";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportesFilter } from "@/components/admin/reportes-filter";
import { ExportDropdown } from "@/components/admin/export-dropdown";
import { CHANNEL_CFG, STATUS_LABELS, DailySalesChart, ChannelPill, Delta } from "./_components/widgets";
import { loadReportes } from "./_data/reportes";

export const metadata: Metadata = { title: "Reportes — Admin En Minutas" };
export const revalidate = 0;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin");

  const { mesParam, daysInMonth, totalGeneral, totalPedidos, ticketProm, canalesSet, canalesCount, prevTotal, prevPedidos, curDayTotals, prevDayTotals, channelMix, topProductos, vendedorStats, deudaSinVendedor, deudaStats, deudaTotal, recentOrders, mesNombre } = await loadReportes(sp.mes);

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">

      {/* ── Header ── */}
      <div className="mb-5 md:mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-brand-700 capitalize">
            {mesNombre}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#57544e" }}>
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
            className="bg-white rounded-xl p-4 md:p-5"
            style={{ border: "1px solid #e3e2de", boxShadow: "0 1px 2px rgba(28,27,24,.05)" }}
          >
            <p className="text-xs mb-1" style={{ color: "#57544e" }}>{label}</p>
            <p
              className={`text-xl md:text-2xl font-semibold font-display tabular-nums ${highlight ? "text-tierra-700" : ""}`}
              style={highlight ? undefined : { color: "#1c1b18" }}
            >
              {value}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs truncate" style={{ color: "#57544e" }}>{sub}</p>
              {delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div
        className="bg-white rounded-xl mb-4 overflow-hidden"
        style={{ border: "1px solid #e3e2de", boxShadow: "0 1px 2px rgba(28,27,24,.05)" }}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: "#1c1b18" }}>
            Ventas diarias
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "#57544e" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5 rounded" style={{ background: "#3f37b3" }} />
              Este mes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 rounded" style={{ height: 1.5, background: "#cfcdc8", borderTop: "1.5px dashed #cfcdc8" }} />
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
              <span key={d} className="text-xs tabular-nums" style={{ color: "#57544e" }}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      {totalPedidos === 0 ? (
        <div
          className="bg-white rounded-xl p-12 text-center"
          style={{ border: "1px solid #e3e2de" }}
        >
          <p className="text-sm" style={{ color: "#57544e" }}>Sin pedidos confirmados en este período.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: orders table */}
          <div
            className="lg:col-span-2 bg-white rounded-xl overflow-hidden"
            style={{ border: "1px solid #e3e2de", boxShadow: "0 1px 2px rgba(28,27,24,.05)" }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "#e3e2de" }}>
              <p className="text-sm font-medium" style={{ color: "#1c1b18" }}>Pedidos confirmados</p>
              <p className="text-xs mt-0.5" style={{ color: "#57544e" }}>Últimos {recentOrders.length} — todos los canales</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: "#e3e2de" }}>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: "#57544e" }}>#</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: "#57544e" }}>Cliente</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: "#57544e" }}>Canal</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: "#57544e" }}>Estado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: "#57544e" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o: any, i: number) => (
                    <tr
                      key={o.id}
                      className="border-b hover:bg-neutral-50 transition-colors"
                      style={{ borderColor: i < recentOrders.length - 1 ? "#efeeeb" : "transparent" }}
                    >
                      <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: "#57544e" }}>
                        {o.order_number ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium truncate max-w-[140px]" style={{ color: "#1c1b18" }}>
                        {(o.customer as any)?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <ChannelPill channel={o.channel} />
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "#57544e" }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums" style={{ color: "#1c1b18" }}>
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
              className="bg-white rounded-xl overflow-hidden"
              style={{ border: "1px solid #e3e2de", boxShadow: "0 1px 2px rgba(28,27,24,.05)" }}
            >
              <div className="px-5 py-4 border-b" style={{ borderColor: "#e3e2de" }}>
                <p className="text-sm font-medium" style={{ color: "#1c1b18" }}>Mix de canales</p>
              </div>
              <div className="px-5 py-3 space-y-3">
                {channelMix.map(([ch, data]) => {
                  const pct = totalGeneral > 0 ? Math.round((data.total / totalGeneral) * 100) : 0;
                  const cfg = CHANNEL_CFG[ch];
                  return (
                    <div key={ch}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: "#1c1b18" }}>
                          {cfg?.label ?? ch}
                        </span>
                        <span className="text-sm tabular-nums font-semibold" style={{ color: "#1c1b18" }}>
                          {fmtK(data.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full h-1.5" style={{ background: "#efeeeb" }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: cfg?.bar ?? "#3f37b3" }}
                          />
                        </div>
                        <span className="text-xs w-9 text-right tabular-nums" style={{ color: "#57544e" }}>
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
                className="bg-white rounded-xl overflow-hidden"
                style={{ border: "1px solid #e3e2de", boxShadow: "0 1px 2px rgba(28,27,24,.05)" }}
              >
                <div className="px-5 py-4 border-b" style={{ borderColor: "#e3e2de" }}>
                  <p className="text-sm font-medium" style={{ color: "#1c1b18" }}>Top productos</p>
                  <p className="text-xs mt-0.5" style={{ color: "#57544e" }}>Por cajas vendidas</p>
                </div>
                <div className="divide-y" style={{ borderColor: "#efeeeb" }}>
                  {topProductos.map((p, i) => (
                    <div key={p.sku} className="px-5 py-2.5 flex items-center gap-3">
                      <span
                        className="text-xs tabular-nums w-5 shrink-0 text-right font-medium"
                        style={{ color: "#57544e" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#1c1b18" }}>
                          {p.name}
                        </p>
                        <p className="text-xs" style={{ color: "#57544e" }}>{p.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums" style={{ color: "#1c1b18" }}>
                          {p.cajas}
                        </p>
                        <p className="text-xs tabular-nums" style={{ color: "#57544e" }}>cajas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Ventas por vendedor ── */}
      {vendedorStats.length > 0 && (
        <div
          className="mt-4 bg-white rounded-xl overflow-hidden"
          style={{ border: "1px solid #e3e2de", boxShadow: "0 1px 2px rgba(28,27,24,.05)" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "#e3e2de" }}>
            <p className="text-sm font-medium" style={{ color: "#1c1b18" }}>Ventas por vendedor</p>
            <p className="text-xs mt-0.5" style={{ color: "#57544e" }}>
              {mesNombre} — pedidos con cliente B2B asignado
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "#e3e2de" }}>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: "#57544e" }}>Vendedor</th>
                  <th className="px-5 py-3 text-xs font-semibold text-right" style={{ color: "#57544e" }}>Pedidos</th>
                  <th className="px-5 py-3 text-xs font-semibold text-right" style={{ color: "#57544e" }}>Total</th>
                  <th className="px-5 py-3 text-xs font-semibold text-right" style={{ color: "#57544e" }}>Ticket prom.</th>
                </tr>
              </thead>
              <tbody>
                {vendedorStats.map((v, i) => (
                  <tr
                    key={v.nombre}
                    className="border-b"
                    style={{ borderColor: i < vendedorStats.length - 1 ? "#efeeeb" : "transparent" }}
                  >
                    <td className="px-5 py-3 font-medium" style={{ color: "#1c1b18" }}>{v.nombre}</td>
                    <td className="px-5 py-3 text-right tabular-nums" style={{ color: "#57544e" }}>{v.pedidos}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums" style={{ color: "#1c1b18" }}>
                      {fmt(v.total)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums" style={{ color: "#57544e" }}>
                      {fmt(Math.round(v.total / v.pedidos))}
                    </td>
                  </tr>
                ))}
              </tbody>
              {vendedorStats.length > 1 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid #e3e2de" }}>
                    <td className="px-5 py-3 text-xs font-semibold" style={{ color: "#57544e" }}>
                      Total con vendedor asignado
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-xs font-semibold" style={{ color: "#57544e" }}>
                      {vendedorStats.reduce((s, v) => s + v.pedidos, 0)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-bold" style={{ color: "#1c1b18" }}>
                      {fmt(vendedorStats.reduce((s, v) => s + v.total, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
      {/* ── Deuda cuenta corriente por vendedor ── */}
      {(deudaStats.length > 0 || deudaSinVendedor > 0) && (
        <div
          className="mt-4 bg-white rounded-xl overflow-hidden"
          style={{ border: "1px solid #e3e2de", boxShadow: "0 1px 2px rgba(28,27,24,.05)" }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: "#e3e2de" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "#1c1b18" }}>Deuda en cuenta corriente por vendedor</p>
              <p className="text-xs mt-0.5" style={{ color: "#57544e" }}>
                Pedidos activos con pago en cuenta corriente — pendientes de liquidar
              </p>
            </div>
            <span className="text-base font-bold tabular-nums" style={{ color: "#1c1b18" }}>
              Total: {fmt(deudaTotal)}
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: "#efeeeb" }}>
            {deudaStats.map((v) => {
              const clientesList = Object.values(v.clientes).sort((a, b) => b.total - a.total);
              return (
                <details key={v.nombre} className="group">
                  <summary className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50 list-none">
                    <div className="flex items-center gap-3">
                      <svg className="size-3.5 text-neutral-600 group-open:rotate-90 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-medium" style={{ color: "#1c1b18" }}>{v.nombre}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {clientesList.length} cliente{clientesList.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "#8a5a00" }}>
                      {fmt(v.total)}
                    </span>
                  </summary>
                  <div className="bg-neutral-50 divide-y" style={{ borderColor: "#efeeeb" }}>
                    {clientesList.map((c) => (
                      <div key={c.nombre} className="px-10 py-2.5 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-sm text-neutral-700">{c.nombre}</span>
                          <span className="ml-2 text-xs text-neutral-600">{c.pedidos} pedido{c.pedidos !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="text-sm font-medium tabular-nums" style={{ color: "#1c1b18" }}>
                          {fmt(c.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}

            {deudaSinVendedor > 0 && (
              <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                <span className="text-sm text-neutral-600 italic">Sin vendedor asignado</span>
                <span className="text-sm font-semibold tabular-nums text-neutral-600">
                  {fmt(deudaSinVendedor)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
