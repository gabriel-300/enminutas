import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, KpiCard, PageHeader, TONE_STYLES } from "@/components/ui";
import { cn } from "@/lib/utils";
import { IC } from "../_components/icons";
import { loadDistribucionDashboard } from "../_data/distribucion";

export async function DistribucionDashboard({ user }: { user: { id: string } }) {
  const { now, zonaFiltro, zonaNombre, enTransitoList, entregadosHoyList, evolucion, maxMonth, entregasMes } = await loadDistribucionDashboard(user);

  const quickLinks = [
    { href: "/admin/distribucion",              label: "Pendientes de entrega", badge: enTransitoList.length > 0 ? `${enTransitoList.length}` : null, icon: IC.distribucion },
    { href: "/admin/distribucion/hoja-de-ruta", label: "Hoja de ruta hoy",      badge: null as string | null, icon: IC.zonas },
    { href: "/admin/distribucion/historial",    label: "Historial",            badge: null as string | null, icon: IC.clock },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        title="Dashboard"
        subtitle={
          <span className="capitalize">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {zonaNombre && <span className="ml-2 text-n-500">— Zona: {zonaNombre}</span>}
          </span>
        }
      />
      {!zonaFiltro && (
        <p className="-mt-4 text-xs text-warning">Sin zona asignada — pedile al admin que configure tu zona en Staff.</p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiCard
          href="/admin/distribucion"
          label="En tránsito"
          value={enTransitoList.length}
          icon={IC.distribucion}
          tone={enTransitoList.length > 0 ? "warning" : "default"}
          footer={`pendiente${enTransitoList.length !== 1 ? "s" : ""} de entrega`}
        />
        <KpiCard
          label="Entregados hoy"
          value={entregadosHoyList.length}
          icon={<CheckCircle2 />}
          tone={entregadosHoyList.length > 0 ? "success" : "default"}
          footer="pedidos entregados"
        />
        <KpiCard
          href="/admin/distribucion/historial"
          label="Este mes"
          value={entregasMes}
          icon={IC.clock}
          footer={`entregas en ${now.toLocaleDateString("es-AR", { month: "long" })}`}
        />
      </div>

      {/* Cuerpo — dos columnas */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">

        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">

          <Card>
            <CardHeader
              title="En tránsito ahora"
              action={
                <Link href="/admin/distribucion" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                  Ver todo <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {enTransitoList.length === 0 ? (
              <p className="py-8 text-center text-sm text-n-600">Sin pedidos en tránsito.</p>
            ) : (
              <ul>
                {enTransitoList.slice(0, 5).map((o: any) => {
                  const dias = o.despachado_at
                    ? Math.floor((Date.now() - new Date(o.despachado_at).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <li key={o.id} className="flex items-center gap-3 border-b border-n-100 px-5 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-n-800">{o.customer?.full_name ?? "—"}</p>
                        <p className="font-mono text-xs text-n-600">{o.order_number}</p>
                      </div>
                      {dias !== null && dias > 0 && (
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", dias > 3 ? TONE_STYLES.danger.tile : TONE_STYLES.warning.tile)}>
                          {dias}d
                        </span>
                      )}
                    </li>
                  );
                })}
                {enTransitoList.length > 5 && (
                  <li className="px-5 py-3 text-center text-xs text-n-600">+{enTransitoList.length - 5} más</li>
                )}
              </ul>
            )}
          </Card>

          {entregadosHoyList.length > 0 && (
            <Card className="border-success-border">
              <CardHeader title={<span className="text-success">Entregados hoy</span>} />
              <ul>
                {entregadosHoyList.map((o: any) => (
                  <li key={o.id} className="flex items-center gap-3 border-b border-n-100 px-5 py-3 last:border-b-0">
                    <span className="shrink-0 text-sm text-success">✓</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-n-700">{o.customer?.full_name ?? "—"}</p>
                      <ul className="mt-0.5 flex flex-wrap gap-x-3">
                        {(o.lines ?? []).map((l: any, i: number) => (
                          <li key={i} className="text-xs text-n-600">
                            {l.quantity}× {l.product_snapshot?.name ?? "Producto"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">

          <Card>
            <CardHeader title="Entregas por mes" />
            <div className="flex flex-col gap-3 px-5 py-4">
              {evolucion.map((m) => (
                <div key={m.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("text-xs capitalize", m.current ? "font-bold text-n-900" : "text-n-600")}>
                      {m.label}{m.current ? " (actual)" : ""}
                    </span>
                    <span className={cn("text-xs tabular-nums", m.current ? "font-bold text-brand-700" : "font-medium text-n-700")}>
                      {m.count > 0 ? `${m.count} entregas` : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div
                      className={cn("h-full rounded-full", m.current ? "bg-brand-700" : "bg-brand-300")}
                      style={{ width: m.count > 0 ? `${Math.round((m.count / maxMonth) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
      </div>
    </div>
  );
}
