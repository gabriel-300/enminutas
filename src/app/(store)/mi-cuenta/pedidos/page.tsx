import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Mis pedidos — En Minutas" };
export const revalidate = 0;

export default async function MisPedidosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/mi-cuenta/pedidos");

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, total, payment_method, created_at,
      lines:order_lines (id)
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const paymentLabel: Record<string, string> = {
    bank_transfer: "Transferencia",
    mercado_pago: "Mercado Pago",
    cash: "Efectivo",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-semibold text-neutral-900">Mis pedidos</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {orders?.length
            ? `${orders.length} pedido${orders.length !== 1 ? "s" : ""}`
            : "Todavía no hiciste ningún pedido"}
        </p>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Link
              key={order.id}
              href={`/mi-cuenta/pedidos/${order.id}`}
              className="block bg-white rounded-2xl border border-neutral-200 p-5 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-neutral-400 mb-1">{order.order_number}</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {order.lines?.length ?? 0} producto{order.lines?.length !== 1 ? "s" : ""}
                    {" · "}
                    {paymentLabel[order.payment_method] ?? order.payment_method}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(order.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-semibold text-neutral-900 mb-1">
                    $ {Number(order.total).toLocaleString("es-AR")}
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
          <p className="text-neutral-400 text-sm mb-4">Cuando realices tu primer pedido aparecerá acá.</p>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 text-sm font-medium text-tierra-700 hover:underline"
          >
            Ir al catálogo →
          </Link>
        </div>
      )}
    </div>
  );
}
