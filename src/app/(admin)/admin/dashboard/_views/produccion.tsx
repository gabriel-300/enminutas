import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardHeader, KpiCard, PageHeader, TONE_STYLES } from "@/components/ui";
import { cn } from "@/lib/utils";
import { IC } from "../_components/icons";
import { loadProduccionDashboard } from "../_data/produccion";

function diasDesdeAprobado(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export async function ProduccionDashboard() {
  const { now, cola, preparando, stockCritico } = await loadProduccionDashboard();

  const quickLinks = [
    { href: "/admin/produccion",          label: "Producción",       badge: cola.length > 0 ? `${cola.length} en cola` : null, icon: IC.produccion },
    { href: "/admin/cocina",              label: "Cocina / Stock",   badge: stockCritico.length > 0 ? `${stockCritico.length} críticos` : null, icon: IC.cocina },
    { href: "/admin/cocina/planificador", label: "Planificador",     badge: null as string | null, icon: IC.planificador },
    { href: "/admin/cocina/compras",      label: "Lista de compras", badge: null as string | null, icon: IC.compras },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        title="Dashboard"
        subtitle={<span className="capitalize">{now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiCard
          href="/admin/produccion"
          label="En cola"
          value={cola.length}
          icon={IC.pedidos}
          footer={`pedido${cola.length !== 1 ? "s" : ""} sin iniciar`}
        />
        <KpiCard
          href="/admin/produccion"
          label="En preparación"
          value={preparando.length}
          icon={IC.cocina}
          tone={preparando.length > 0 ? "success" : "default"}
          footer="en cocina ahora"
        />
        <KpiCard
          href="/admin/cocina"
          label="Stock crítico"
          value={stockCritico.length}
          icon={<AlertTriangle />}
          tone={stockCritico.length > 0 ? "danger" : "default"}
          footer={`producto${stockCritico.length !== 1 ? "s" : ""} bajo mínimo`}
        />
      </div>

      {/* Cuerpo — dos columnas */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">

        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">

          {stockCritico.length > 0 && (
            <Card>
              <CardHeader
                title="Stock crítico"
                action={
                  <Link href="/admin/cocina" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                    Ver todo <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              <ul>
                {stockCritico.map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-n-100 bg-danger-bg/20 px-5 py-3 last:border-b-0">
                    <span className={cn("size-1.5 shrink-0 rounded-full", TONE_STYLES.danger.dot)} />
                    <p className="flex-1 text-sm text-n-800">
                      <span className="font-semibold">{p.name}</span>
                      <span className="ml-2 font-mono text-xs text-n-600">{p.sku}</span>
                    </p>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-danger">
                      {Number(p.stock_cajas ?? 0)} / {Number(p.stock_minimo)} cajas
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Cola — pendientes de iniciar"
              action={
                <Link href="/admin/produccion" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                  Ver todo <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {cola.length === 0 ? (
              <p className="py-8 text-center text-sm text-n-600">Sin pedidos en cola.</p>
            ) : (
              <ul>
                {cola.slice(0, 5).map((o: any) => {
                  const dias = diasDesdeAprobado(o.aprobado_at);
                  return (
                    <li key={o.id} className="border-b border-n-100 px-5 py-3 last:border-b-0">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-n-700">{o.order_number}</span>
                        {dias !== null && dias > 1 && (
                          <span className="text-xs font-medium text-warning">Aprobado hace {dias}d</span>
                        )}
                      </div>
                      <ul className="space-y-0.5">
                        {(o.lines ?? []).map((l: any, i: number) => (
                          <li key={i} className="text-xs text-n-600">
                            <span className="font-semibold text-n-700">{l.quantity}×</span>{" "}
                            {l.product_snapshot?.name ?? "Producto"}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
                {cola.length > 5 && (
                  <li className="px-5 py-3 text-center text-xs text-n-600">
                    +{cola.length - 5} más en cola
                  </li>
                )}
              </ul>
            )}
          </Card>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">

          {preparando.length > 0 && (
            <Card className="border-success-border">
              <CardHeader title={<span className="text-success">En preparación ahora</span>} />
              <ul>
                {preparando.map((o: any) => (
                  <li key={o.id} className="border-b border-n-100 bg-success-bg/20 px-5 py-3 last:border-b-0">
                    <span className="mb-1 block font-mono text-xs font-semibold text-n-700">{o.order_number}</span>
                    {(o.lines ?? []).map((l: any, i: number) => (
                      <p key={i} className="text-xs text-n-600">
                        <span className="font-semibold text-n-700">{l.quantity}×</span>{" "}
                        {l.product_snapshot?.name ?? "Producto"}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </Card>
          )}

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
