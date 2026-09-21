import Link from "next/link";
import { fmtK } from "../_lib/helpers";
import { IC } from "../_components/icons";
import { loadVendedorDashboard } from "../_data/vendedor";

export async function VendedorDashboard({ user }: { user: { id: string } }) {
  const { now, mesNombre, misIds, pedidosPendientes, pedidosEnProd, ultimosContactos, sinPedidos, inactivos30, inactivos15, activosCnt, ventasMes, objetivo, pctMeta, totalPend, totalInact } = await loadVendedorDashboard(user);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        {/* Meta del mes */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Meta {mesNombre}</p>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(ventasMes)}</p>
          {objetivo > 0 ? (
            <>
              <div className="mt-2 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pctMeta! >= 100 ? "bg-success" : pctMeta! >= 60 ? "bg-tierra-700" : "bg-warning"}`}
                  style={{ width: `${pctMeta}%` }}
                />
              </div>
              <p className="text-xs mt-1 text-neutral-400">{pctMeta}% de {fmtK(objetivo)}</p>
            </>
          ) : (
            <p className="text-xs mt-1 text-neutral-300">Sin meta definida</p>
          )}
        </div>

        {/* Mis clientes */}
        <Link href="/admin/preventista" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Mis clientes</p>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{misIds.length}</p>
          <p className="text-xs mt-1 text-neutral-400">{activosCnt} activos · {totalInact} inactivos</p>
        </Link>

        {/* Inactivos */}
        <div className={`rounded-2xl border p-5 ${(sinPedidos.length + inactivos30.length) > 0 ? "bg-danger-bg/40 border-danger/30" : inactivos15.length > 0 ? "bg-warning-bg/40 border-warning/30" : "bg-white border-neutral-200"}`}>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Requieren contacto</p>
          <p className={`text-3xl font-semibold font-display tabular-nums ${(sinPedidos.length + inactivos30.length) > 0 ? "text-danger" : inactivos15.length > 0 ? "text-warning" : "text-neutral-900"}`}>
            {totalInact}
          </p>
          <p className="text-xs mt-1 text-neutral-400">
            {sinPedidos.length > 0 && `${sinPedidos.length} sin pedidos`}
            {sinPedidos.length > 0 && inactivos30.length > 0 && " · "}
            {inactivos30.length > 0 && `${inactivos30.length} +30d`}
            {(sinPedidos.length + inactivos30.length) > 0 && inactivos15.length > 0 && " · "}
            {inactivos15.length > 0 && `${inactivos15.length} 15–30d`}
            {totalInact === 0 && "Todos activos"}
          </p>
        </div>

        {/* Pedidos en proceso */}
        <Link href="/admin/pedidos" className="bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">En proceso</p>
          <p className="text-3xl font-semibold font-display tabular-nums text-neutral-900">{totalPend}</p>
          <p className="text-xs mt-1 text-neutral-400">
            {(pedidosPendientes ?? 0) > 0 && `${pedidosPendientes} pend. aprobación`}
            {(pedidosPendientes ?? 0) > 0 && (pedidosEnProd ?? 0) > 0 && " · "}
            {(pedidosEnProd ?? 0) > 0 && `${pedidosEnProd} en producción`}
            {totalPend === 0 && "Sin pedidos activos"}
          </p>
        </Link>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Izquierda: alertas + accesos */}
        <div className="lg:col-span-3 space-y-4">

          {/* Alertas */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Mis alertas</p>
            </div>
            {totalInact === 0 && (pedidosPendientes ?? 0) === 0 ? (
              <p className="px-5 py-8 text-sm text-neutral-400 text-center">Sin alertas activas</p>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {sinPedidos.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3 bg-danger-bg/30">
                    <span className="size-1.5 rounded-full bg-danger shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{c.full_name}</span>{" "}
                      <span className="text-neutral-500">sin pedidos registrados — primer contacto</span>
                    </p>
                    <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
                  </li>
                ))}
                {inactivos30.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3 bg-danger-bg/30">
                    <span className="size-1.5 rounded-full bg-danger shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{c.full_name}</span>{" "}
                      <span className="text-neutral-500">sin comprar hace {c.dias} días</span>
                    </p>
                    <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
                  </li>
                ))}
                {inactivos15.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                    <span className="size-1.5 rounded-full bg-warning shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{c.full_name}</span>{" "}
                      <span className="text-neutral-500">sin comprar hace {c.dias} días</span>
                    </p>
                    <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
                  </li>
                ))}
                {(pedidosPendientes ?? 0) > 0 && (
                  <li className="flex items-center gap-3 px-5 py-3 bg-warning-bg/40">
                    <span className="size-1.5 rounded-full bg-warning shrink-0" />
                    <p className="text-sm text-neutral-800 flex-1">
                      <span className="font-semibold">{pedidosPendientes}</span>{" "}
                      <span className="text-neutral-500">pedido{pedidosPendientes !== 1 ? "s" : ""} esperando aprobación</span>
                    </p>
                    <Link href="/admin/pedidos" className="text-xs text-tierra-700 hover:underline shrink-0">Ver →</Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Accesos rápidos</p>
            </div>
            <ul className="divide-y divide-neutral-50">
              {([
                { href: "/admin/preventista",   label: "Mis clientes", badge: totalInact > 0 ? `${totalInact} para contactar` : null, icon: IC.preventista },
                { href: "/admin/pedidos/nuevo", label: "Nuevo pedido",  badge: null, icon: IC.nuevoPedido },
                { href: "/admin/pedidos",       label: "Ver pedidos",   badge: (pedidosPendientes ?? 0) > 0 ? `${pedidosPendientes} pendientes` : null, icon: IC.pedidos },
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

        {/* Derecha: últimos contactos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Últimos contactos</p>
              <Link href="/admin/preventista" className="text-xs text-tierra-700 hover:underline">Ver todo →</Link>
            </div>
            {(ultimosContactos ?? []).length === 0 ? (
              <p className="px-5 py-8 text-sm text-neutral-400 text-center">Todavía no registraste contactos.</p>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {(ultimosContactos as any[]).map((c, i) => {
                  const dias = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  const TIPO_EMOJI: Record<string, string> = {
                    llamada: "📞", visita: "🏪", whatsapp: "💬", email: "✉️", otro: "·",
                  };
                  return (
                    <li key={i} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm">{TIPO_EMOJI[c.tipo] ?? "·"}</span>
                        <span className="text-sm font-medium text-neutral-800 truncate">
                          {(c.cliente as any)?.full_name ?? "—"}
                        </span>
                        <span className="text-xs text-neutral-400 ml-auto shrink-0">
                          {dias === 0 ? "Hoy" : `hace ${dias}d`}
                        </span>
                      </div>
                      {c.notas && (
                        <p className="text-xs text-neutral-500 truncate pl-6">{c.notas}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
