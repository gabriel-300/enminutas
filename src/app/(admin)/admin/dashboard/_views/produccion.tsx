import Link from "next/link";
import { IC } from "../_components/icons";
import { loadProduccionDashboard } from "../_data/produccion";

export async function ProduccionDashboard() {
  const { now, cola, preparando, stockCritico } = await loadProduccionDashboard();


function diasDesdeAprobado(iso: string | null) {
if (!iso) return null;
return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-0.5 capitalize">
          {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
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
                { href: "/admin/produccion",           label: "Producción",        badge: cola.length > 0 ? `${cola.length} en cola` : null, icon: IC.produccion },
                { href: "/admin/cocina",               label: "Cocina / Stock",    badge: stockCritico.length > 0 ? `${stockCritico.length} críticos` : null, icon: IC.cocina },
                { href: "/admin/cocina/planificador",  label: "Planificador",      badge: null, icon: IC.planificador },
                { href: "/admin/cocina/compras",       label: "Lista de compras",  badge: null, icon: IC.compras },
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
