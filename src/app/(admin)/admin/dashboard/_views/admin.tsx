import { fmtK } from "@/lib/format";
import Link from "next/link";
import { loadAdminDashboard } from "../_data/admin";

export async function AdminDashboard() {
  const { now, b2bUsers, pendingClients, activeClients, revenueTotal, revPct, ordersThisMonth, ordersPrevMonth, totalAlerts, topProducts, maxProduct, monthlyEvol, maxMonth, mesNombre, IVA_DIV, preventistasRanking, alertGroups } = await loadAdminDashboard();

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-0.5 capitalize">
          {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
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
            <div className="px-5 py-2.5 border-t border-neutral-50">
              <Link href="/admin/alertas" className="text-xs text-neutral-400 hover:text-[#16233f] transition-colors">
                Ver centro de alertas (stock, lotes, cheques…) →
              </Link>
            </div>
          </div>

          {/* Preventistas del mes */}
          {preventistasRanking.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Preventistas · <span className="normal-case capitalize">{mesNombre}</span>
                </p>
                <Link href="/admin/comisiones" className="text-xs text-tierra-700 hover:underline">
                  Ver comisiones →
                </Link>
              </div>
              <ul className="divide-y divide-neutral-50">
                {preventistasRanking.map((v, i) => (
                  <li key={v.id} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-neutral-300 tabular-nums w-4 shrink-0 text-center">{i + 1}</span>
                      <div className="size-7 rounded-full bg-tierra-100 text-tierra-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                        {v.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{v.name}</p>
                        <p className="text-xs text-neutral-400">{v.orders} pedido{v.orders !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-neutral-900">
                          {fmtK(v.total)} <span className="text-[10px] font-normal text-neutral-400">c/IVA</span>
                        </p>
                        <p className="text-xs tabular-nums text-neutral-400">
                          {fmtK(v.total / IVA_DIV)} <span className="text-[10px]">s/IVA</span>
                        </p>
                      </div>
                    </div>
                    {v.clientes.length > 0 && (
                      <details className="mt-2 ml-7">
                        <summary className="text-xs text-tierra-700 hover:underline cursor-pointer list-none">
                          Por cliente ({v.clientes.length}) →
                        </summary>
                        <ul className="mt-1.5 space-y-1 border-l border-neutral-100 pl-3">
                          {v.clientes.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs text-neutral-600 truncate">{c.name}</span>
                              <span className="text-xs tabular-nums text-neutral-500 shrink-0">
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
