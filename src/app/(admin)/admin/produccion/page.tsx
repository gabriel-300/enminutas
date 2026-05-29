import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MarcarEnviadoProdButton } from "@/components/admin/marcar-enviado-prod-button";
import { DespacharButton } from "@/components/admin/despachar-button";
import { fmtFecha } from "@/lib/fecha";

export const metadata: Metadata = { title: "Producción — Admin En Minutas" };
export const revalidate = 0;

function OrderCard({
  order,
  action,
}: {
  order:  any;
  action: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-semibold text-neutral-900">
              {order.order_number}
            </span>
            <span className="text-sm text-neutral-600">
              {order.customer?.full_name ?? "—"}
            </span>
            {order.aprobado_at && (
              <span className="text-xs text-neutral-400">
                Aprobado:{" "}
                {fmtFecha(order.aprobado_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <ul className="mt-3 space-y-1">
            {(order.lines ?? []).map((line: any, i: number) => (
              <li key={i} className="flex items-baseline gap-2 text-sm text-neutral-700">
                <span className="font-semibold tabular-nums w-6 shrink-0 text-right">
                  {line.quantity}×
                </span>
                <span>{line.product_snapshot?.name ?? "Producto"}</span>
                {line.product_snapshot?.unit_label && (
                  <span className="text-xs text-neutral-400">
                    ({line.product_snapshot.unit_label})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {action}
      </div>
    </div>
  );
}

export default async function ProduccionPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await (adminClient as any)
    .from("orders")
    .select(`
      id, order_number, status, created_at, aprobado_at,
      customer:profiles!customer_id (full_name),
      lines:order_lines (quantity, product_snapshot)
    `)
    .eq("channel", "b2b_mayorista")
    .in("status", ["aprobado", "enviado_prod"])
    .order("aprobado_at", { ascending: true });

  const lista       = (orders ?? []) as any[];
  const cola        = lista.filter((o) => o.status === "aprobado");
  const preparando  = lista.filter((o) => o.status === "enviado_prod");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Producción</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {lista.length === 0
            ? "Sin pedidos activos en este momento."
            : `${cola.length} en cola · ${preparando.length} en preparación`}
        </p>
      </div>

      {/* Cola de producción */}
      {cola.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            En cola — pendientes de preparación
          </h2>
          <div className="space-y-3">
            {cola.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                action={<MarcarEnviadoProdButton orderId={order.id} />}
              />
            ))}
          </div>
        </section>
      )}

      {/* En preparación */}
      {preparando.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            En preparación — listos para despachar
          </h2>
          <div className="space-y-3">
            {preparando.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                action={<DespacharButton orderId={order.id} />}
              />
            ))}
          </div>
        </section>
      )}

      {lista.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay pedidos activos en producción.</p>
        </div>
      )}
    </div>
  );
}
