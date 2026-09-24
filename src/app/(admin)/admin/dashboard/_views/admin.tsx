import { fmtK } from "@/lib/format";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, BarChart3, Building2, CheckCircle2, ClipboardList, Info } from "lucide-react";
import { Card, CardHeader, KpiCard, PageHeader, TONE_STYLES, type Tone } from "@/components/ui";
import { cn } from "@/lib/utils";
import { loadAdminDashboard } from "../_data/admin";

// El loader entrega clases de color por grupo; de ahí se deduce el tono.
function toneFromDot(dotClass: string): Tone {
  if (dotClass.includes("danger")) return "danger";
  if (dotClass.includes("warning")) return "warning";
  if (dotClass.includes("success")) return "success";
  return "neutral";
}

const TONE_ICON: Record<Tone, React.ElementType> = {
  danger: AlertCircle, warning: AlertTriangle, success: CheckCircle2, neutral: Info, info: Info, brand: Info,
};

const BAR_MAX_PX = 170;

export async function AdminDashboard() {
  const { now, b2bUsers, pendingClients, activeClients, revenueTotal, revPct, ordersThisMonth, ordersPrevMonth, totalAlerts, topProducts, maxProduct, monthlyEvol, maxMonth, mesNombre, IVA_DIV, preventistasRanking, alertGroups } = await loadAdminDashboard();

  const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1).toLocaleDateString("es-AR", { month: "long" });

  return (
    <div className="flex flex-col gap-6 p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        title="Dashboard"
        subtitle={<span className="capitalize">{now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiCard
          href="/admin/reportes"
          label={`Ventas ${mesNombre}`}
          value={fmtK(revenueTotal)}
          icon={<BarChart3 />}
          pill={revPct !== null ? { text: `${revPct >= 0 ? "↑" : "↓"} ${Math.abs(revPct)}%`, tone: revPct >= 0 ? "success" : "danger" } : undefined}
          footer={revPct !== null ? `vs ${prevMonthName}` : undefined}
        />
        <KpiCard
          href="/admin/pedidos"
          label={`Pedidos ${mesNombre}`}
          value={ordersThisMonth}
          icon={<ClipboardList />}
          footer={`${ordersPrevMonth} el mes anterior`}
        />
        <KpiCard
          label="Alertas activas"
          value={totalAlerts}
          icon={<AlertTriangle />}
          tone={totalAlerts > 0 ? "warning" : "default"}
          footer={totalAlerts === 0 ? "Todo en orden" : `${alertGroups.length} grupo${alertGroups.length !== 1 ? "s" : ""} activo${alertGroups.length !== 1 ? "s" : ""}`}
        />
        <KpiCard
          href="/admin/clientes-b2b"
          label="Clientes activos"
          value={activeClients}
          icon={<Building2 />}
          footer={`${b2bUsers.length} totales${pendingClients > 0 ? ` · ${pendingClients} pendientes` : ""}`}
        />
      </div>

      {/* Cuerpo — dos columnas */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">

        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">

          {/* Evolución de ventas — gráfico de barras verticales */}
          <Card>
            <CardHeader title="Evolución de ventas" />
            <div
              className="grid items-end gap-4 px-6 pb-4 pt-5"
              style={{ gridTemplateColumns: `repeat(${monthlyEvol.length || 1}, minmax(0, 1fr))`, height: 260 }}
            >
              {monthlyEvol.map((m) => {
                const pxH = maxMonth > 0 ? Math.round((m.total / maxMonth) * BAR_MAX_PX) : 0;
                return (
                  <div key={m.key} className="flex h-full flex-col items-stretch justify-end gap-1.5">
                    <span className={cn(
                      "text-center text-xs tabular-nums",
                      m.current ? "font-semibold text-brand-700" : "text-n-600",
                      m.total === 0 && "invisible"
                    )}>
                      {fmtK(m.total)}
                    </span>
                    <div
                      className={cn("rounded-t-md rounded-b-sm", m.total === 0 ? "bg-n-200" : m.current ? "bg-brand-700" : "bg-brand-300")}
                      style={{ height: m.total === 0 ? 3 : Math.max(pxH, 4) }}
                    />
                    <span className={cn(
                      "border-t border-n-200 pt-1 text-center text-xs capitalize",
                      m.current ? "font-semibold text-brand-700" : "text-n-600"
                    )}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Productos más vendidos */}
          <Card>
            <CardHeader title="Productos más vendidos" />
            <div className="flex flex-col px-5 pb-4 pt-2">
              {topProducts.length === 0 ? (
                <p className="py-4 text-center text-sm text-n-600">Sin datos este mes</p>
              ) : topProducts.map(([name, total], i) => (
                <div key={name} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b border-n-100 py-2.5 last:border-b-0">
                  <span className="text-[13px] tabular-nums text-n-600">{i + 1}</span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="truncate text-sm font-medium text-n-900" title={name}>{name}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.round((total / maxProduct) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums text-n-900">{fmtK(total)}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">

          {/* Requiere atención — alertas agrupadas */}
          <Card>
            <CardHeader
              title="Requiere atención"
              action={totalAlerts > 0 && (
                <span className={cn("rounded-full border px-2 py-px text-xs font-semibold tabular-nums", TONE_STYLES.warning.badge)}>
                  {totalAlerts > 99 ? "99+" : totalAlerts}
                </span>
              )}
            />
            {alertGroups.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-success">Todo en orden</p>
                <p className="mt-0.5 text-[13px] text-n-600">Sin alertas activas</p>
              </div>
            ) : (
              <ul>
                {alertGroups.map((g, i) => {
                  const tone = toneFromDot(g.dotClass);
                  const Icon = TONE_ICON[tone];
                  return (
                    <li key={i} className="flex items-center gap-3 border-b border-n-100 px-5 py-3.5">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", TONE_STYLES[tone].tile)}>
                        <Icon />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="text-sm font-medium text-n-900">{g.title}</p>
                        <p className={cn("text-[13px]", tone === "neutral" ? "text-n-600" : TONE_STYLES[tone].text)}>{g.ctx}</p>
                      </div>
                      <Link
                        href={g.href}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-n-btn bg-n-0 px-2.5 text-[13px] font-medium text-n-800 shadow-btn transition-colors hover:border-n-400 hover:bg-n-50"
                      >
                        Ver <ArrowRight className="size-3.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="px-5 py-3">
              <Link href="/admin/alertas" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                Ver centro de alertas (stock, lotes, cheques…) <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>

          {/* Preventistas del mes */}
          {preventistasRanking.length > 0 && (
            <Card>
              <CardHeader
                title={<>Preventistas <span className="font-normal capitalize text-n-600">· {mesNombre}</span></>}
                action={
                  <Link href="/admin/comisiones" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                    Ver comisiones <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              <ul>
                {preventistasRanking.map((v, i) => (
                  <li key={v.id} className="border-b border-n-100 px-5 py-3.5 last:border-b-0">
                    <div className="grid grid-cols-[16px_36px_minmax(0,1fr)_auto] items-center gap-3">
                      <span className="text-[13px] tabular-nums text-n-600">{i + 1}</span>
                      <div className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-800">
                        {v.initials}
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate text-sm font-medium text-n-900">{v.name}</p>
                        <p className="text-[13px] text-n-600">{v.orders} pedido{v.orders !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex flex-col gap-0.5 text-right tabular-nums">
                        <p className="text-[15px] font-semibold text-n-900">
                          {fmtK(v.total)} <span className="text-xs font-normal text-n-600">c/IVA</span>
                        </p>
                        <p className="text-[13px] text-n-600">{fmtK(v.total / IVA_DIV)} s/IVA</p>
                      </div>
                    </div>
                    {v.clientes.length > 0 && (
                      <details className="ml-[76px] mt-1">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                          Por cliente ({v.clientes.length}) <ArrowRight className="size-3.5" />
                        </summary>
                        <ul className="mt-2 space-y-1.5 border-l border-n-200 pl-3">
                          {v.clientes.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] text-n-700">{c.name}</span>
                              <span className="shrink-0 text-[13px] tabular-nums text-n-600">
                                {fmtK(c.total)} c/IVA · {fmtK(c.total / IVA_DIV)} s/IVA
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
