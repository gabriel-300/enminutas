import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConfirmarEntregaButton } from "@/components/admin/confirmar-entrega-button";

export const metadata: Metadata = { title: "Distribución — Admin En Minutas" };
export const revalidate = 0;

export default async function DistribucionPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await (adminClient as any)
    .from("orders")
    .select(`
      id, order_number, status, total, created_at, despachado_at,
      shipping_method, shipping_snapshot,
      customer:profiles!customer_id (full_name, phone),
      guest_phone,
      lines:order_lines (quantity, product_snapshot)
    `)
    .eq("channel", "b2b_mayorista")
    .eq("status", "despachado")
    .order("despachado_at", { ascending: true });

  const lista = (orders ?? []) as any[];

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Distribución</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {lista.length === 0
            ? "No hay pedidos en tránsito."
            : `${lista.length} pedido${lista.length !== 1 ? "s" : ""} despachado${lista.length !== 1 ? "s" : ""} pendiente${lista.length !== 1 ? "s" : ""} de entrega`}
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay pedidos despachados pendientes de entrega.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((order) => {
            const phone = order.customer?.phone ?? order.guest_phone;
            const address = order.shipping_snapshot
              ? [
                  order.shipping_snapshot.street,
                  order.shipping_snapshot.number,
                  order.shipping_snapshot.city,
                ].filter(Boolean).join(", ")
              : null;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-neutral-900">
                        {order.order_number}
                      </span>
                      <span className="text-sm font-medium text-neutral-700">
                        {order.customer?.full_name ?? "—"}
                      </span>
                      <span className="text-sm font-semibold text-neutral-900">
                        {fmt(Number(order.total))}
                      </span>
                    </div>

                    {phone && (
                      <p className="text-xs text-neutral-500 mb-1">Tel: {phone}</p>
                    )}
                    {address && (
                      <p className="text-xs text-neutral-500 mb-2">{address}</p>
                    )}

                    {order.despachado_at && (
                      <p className="text-xs text-neutral-400 mb-3">
                        Despachado:{" "}
                        {new Date(order.despachado_at).toLocaleString("es-AR", {
                          day: "2-digit", month: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}

                    <ul className="space-y-0.5">
                      {(order.lines ?? []).map((line: any, i: number) => (
                        <li key={i} className="flex items-baseline gap-2 text-sm text-neutral-600">
                          <span className="font-semibold tabular-nums w-6 shrink-0 text-right text-neutral-800">
                            {line.quantity}×
                          </span>
                          <span>{line.product_snapshot?.name ?? "Producto"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <ConfirmarEntregaButton orderId={order.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
