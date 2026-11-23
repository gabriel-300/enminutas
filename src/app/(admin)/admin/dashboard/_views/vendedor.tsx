import { fmtK } from "@/lib/format";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Target } from "lucide-react";
import { Card, CardHeader, KpiCard, PageHeader, TONE_STYLES, type Tone } from "@/components/ui";
import { cn } from "@/lib/utils";
import { IC } from "../_components/icons";
import { loadVendedorDashboard } from "../_data/vendedor";

const TIPO_EMOJI: Record<string, string> = {
  llamada: "📞", visita: "🏪", whatsapp: "💬", email: "✉️", otro: "·",
};

export async function VendedorDashboard({ user }: { user: { id: string } }) {
  const { now, mesNombre, misIds, pedidosPendientes, pedidosEnProd, ultimosContactos, sinPedidos, inactivos30, inactivos15, activosCnt, ventasMes, objetivo, pctMeta, totalPend, totalInact } = await loadVendedorDashboard(user);

  const inactTone: Tone | "default" = (sinPedidos.length + inactivos30.length) > 0 ? "danger" : inactivos15.length > 0 ? "warning" : "default";
  const metaTone  = objetivo > 0 ? (pctMeta! >= 100 ? "success" : pctMeta! >= 60 ? "brand" : "warning") : "neutral";

  const quickLinks = [
    { href: "/admin/preventista",   label: "Mis clientes", badge: totalInact > 0 ? `${totalInact} para contactar` : null, icon: IC.preventista },
    { href: "/admin/pedidos/nuevo", label: "Nuevo pedido",  badge: null as string | null, icon: IC.nuevoPedido },
    { href: "/admin/pedidos",       label: "Ver pedidos",   badge: (pedidosPendientes ?? 0) > 0 ? `${pedidosPendientes} pendientes` : null, icon: IC.pedidos },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        title="Dashboard"
        subtitle={<span className="capitalize">{now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">

        {/* Meta del mes — tiene barra de progreso propia, no usa KpiCard */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-n-200 bg-n-0 px-5 py-[18px] shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-n-600">Meta {mesNombre}</p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 [&_svg]:size-[18px]">
              <Target />
            </span>
          </div>
          <p className="text-3xl font-semibold leading-10 tracking-[-0.02em] tabular-nums text-n-900">{fmtK(ventasMes)}</p>
          {objetivo > 0 ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                <div
                  className={cn("h-full rounded-full transition-all", TONE_STYLES[metaTone].dot)}
                  style={{ width: `${pctMeta}%` }}
                />
              </div>
              <p className="text-[13px] text-n-600">{pctMeta}% de {fmtK(objetivo)}</p>
            </>
          ) : (
            <p className="text-[13px] text-n-500">Sin meta definida</p>
          )}
        </div>

        <KpiCard
          href="/admin/preventista"
          label="Mis clientes"
          value={misIds.length}
          icon={IC.preventista}
          footer={`${activosCnt} activos · ${totalInact} inactivos`}
        />

        <KpiCard
          label="Requiere contacto"
          value={totalInact}
          icon={<AlertTriangle />}
          tone={inactTone}
          footer={
            totalInact === 0 ? "Todos activos" : [
              sinPedidos.length > 0 && `${sinPedidos.length} sin pedidos`,
              inactivos30.length > 0 && `${inactivos30.length} +30d`,
              inactivos15.length > 0 && `${inactivos15.length} 15–30d`,
            ].filter(Boolean).join(" · ")
          }
        />

        <KpiCard
          href="/admin/pedidos"
          label="En proceso"
          value={totalPend}
          icon={IC.pedidos}
          footer={
            totalPend === 0 ? "Sin pedidos activos" : [
              (pedidosPendientes ?? 0) > 0 && `${pedidosPendientes} pend. aprobación`,
              (pedidosEnProd ?? 0) > 0 && `${pedidosEnProd} en producción`,
            ].filter(Boolean).join(" · ")
          }
        />
      </div>

      {/* Cuerpo — dos columnas */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">

        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">

          <Card>
            <CardHeader title="Mis alertas" />
            {totalInact === 0 && (pedidosPendientes ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-n-600">Sin alertas activas</p>
            ) : (
              <ul>
                {sinPedidos.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-n-100 bg-danger-bg/20 px-5 py-3 last:border-b-0">
                    <span className={cn("size-1.5 shrink-0 rounded-full", TONE_STYLES.danger.dot)} />
                    <p className="flex-1 text-sm text-n-800">
                      <span className="font-semibold">{c.full_name}</span>{" "}
                      <span className="text-n-600">sin pedidos registrados — primer contacto</span>
                    </p>
                    <Link href="/admin/preventista" className="shrink-0 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline">Ver →</Link>
                  </li>
                ))}
                {inactivos30.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-n-100 bg-danger-bg/20 px-5 py-3 last:border-b-0">
                    <span className={cn("size-1.5 shrink-0 rounded-full", TONE_STYLES.danger.dot)} />
                    <p className="flex-1 text-sm text-n-800">
                      <span className="font-semibold">{c.full_name}</span>{" "}
                      <span className="text-n-600">sin comprar hace {c.dias} días</span>
                    </p>
                    <Link href="/admin/preventista" className="shrink-0 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline">Ver →</Link>
                  </li>
                ))}
                {inactivos15.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-n-100 bg-warning-bg/30 px-5 py-3 last:border-b-0">
                    <span className={cn("size-1.5 shrink-0 rounded-full", TONE_STYLES.warning.dot)} />
                    <p className="flex-1 text-sm text-n-800">
                      <span className="font-semibold">{c.full_name}</span>{" "}
                      <span className="text-n-600">sin comprar hace {c.dias} días</span>
                    </p>
                    <Link href="/admin/preventista" className="shrink-0 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline">Ver →</Link>
                  </li>
                ))}
                {(pedidosPendientes ?? 0) > 0 && (
                  <li className="flex items-center gap-3 border-b border-n-100 bg-warning-bg/30 px-5 py-3 last:border-b-0">
                    <span className={cn("size-1.5 shrink-0 rounded-full", TONE_STYLES.warning.dot)} />
                    <p className="flex-1 text-sm text-n-800">
                      <span className="font-semibold">{pedidosPendientes}</span>{" "}
                      <span className="text-n-600">pedido{pedidosPendientes !== 1 ? "s" : ""} esperando aprobación</span>
                    </p>
                    <Link href="/admin/pedidos" className="shrink-0 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline">Ver →</Link>
                  </li>
                )}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Accesos rápidos" />
            <ul>
              {quickLinks.map(({ href, label, badge, icon }) => (
                <li key={href} className="border-b border-n-100 last:border-b-0">
                  <Link href={href} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-n-50">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 [&_svg]:size-[18px]">
                        {icon}
                      </span>
                      <span className="truncate text-sm text-n-800">{label}</span>
                    </span>
                    {badge ? (
                      <span className={cn("shrink-0 rounded-full border px-2 py-px text-xs font-medium", TONE_STYLES.warning.badge)}>{badge}</span>
                    ) : (
                      <ArrowRight className="size-4 shrink-0 text-n-400" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Últimos contactos"
              action={
                <Link href="/admin/preventista" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                  Ver todo <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {(ultimosContactos ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-n-600">Todavía no registraste contactos.</p>
            ) : (
              <ul>
                {(ultimosContactos as any[]).map((c, i) => {
                  const dias = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <li key={i} className="border-b border-n-100 px-5 py-3 last:border-b-0">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-sm">{TIPO_EMOJI[c.tipo] ?? "·"}</span>
                        <span className="truncate text-sm font-medium text-n-800">
                          {(c.cliente as any)?.full_name ?? "—"}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-n-600">
                          {dias === 0 ? "Hoy" : `hace ${dias}d`}
                        </span>
                      </div>
                      {c.notas && (
                        <p className="truncate pl-6 text-xs text-n-600">{c.notas}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
