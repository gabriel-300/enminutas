import Link from "next/link";
import { IC } from "../_components/icons";
import { loadDistribucionDashboard } from "../_data/distribucion";

export async function DistribucionDashboard({ user }: { user: { id: string } }) {
  const { now, zonaFiltro, zonaNombre, enTransitoList, entregadosHoyList, evolucion, maxMonth, entregasMes } = await loadDistribucionDashboard(user);

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
