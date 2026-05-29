import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/ui/badge";
import { fmtFechaLarga, fmtFecha } from "@/lib/fecha";

export const metadata: Metadata = { title: "Detalle de pedido — En Minutas" };
export const revalidate = 0;

export default async function MiPedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/mi-cuenta/pedidos");

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, total, subtotal, shipping_fee, discount,
      payment_method, payment_confirmed_at, shipping_method, shipping_snapshot,
      notes, created_at,
      lines:order_lines (
        id, quantity, unit_price, line_total, product_snapshot
      )
    `)
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();

  if (!order) notFound();

  const o = order as any;

  const paymentLabel: Record<string, string> = {
    bank_transfer: "Transferencia bancaria",
    mercado_pago: "Mercado Pago",
    cash: "Efectivo",
  };

  const bankInfo =
    o.payment_method === "bank_transfer" && o.status === "pending_payment";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link
        href="/mi-cuenta/pedidos"
        className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-4 inline-block"
      >
        ← Mis pedidos
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-neutral-900">
            {o.order_number}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {fmtFechaLarga(o.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>

      {/* Productos */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700">Productos</p>
        </div>
        <div className="divide-y divide-neutral-50">
          {(o.lines ?? []).map((line: any) => (
            <div key={line.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-neutral-800">
                  {line.product_snapshot?.name ?? "Producto"}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {line.quantity} × $ {Number(line.unit_price).toLocaleString("es-AR")}
                </p>
              </div>
              <p className="text-sm font-semibold text-neutral-900">
                $ {Number(line.line_total).toLocaleString("es-AR")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>$ {Number(o.subtotal).toLocaleString("es-AR")}</span>
          </div>
          {Number(o.shipping_fee) > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Envío</span>
              <span>$ {Number(o.shipping_fee).toLocaleString("es-AR")}</span>
            </div>
          )}
          {Number(o.discount) > 0 && (
            <div className="flex justify-between text-success">
              <span>Descuento</span>
              <span>− $ {Number(o.discount).toLocaleString("es-AR")}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-100">
            <span>Total</span>
            <span>$ {Number(o.total).toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>

      {/* Info de pago */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Pago</p>
        <p className="text-sm text-neutral-700">{paymentLabel[o.payment_method] ?? o.payment_method}</p>
        {bankInfo && (
          <p className="text-sm text-neutral-500 mt-2">
            Una vez realizada la transferencia, el equipo de En Minutas confirmará tu pedido.
          </p>
        )}
        {o.payment_confirmed_at && (
          <p className="text-sm text-success mt-2">
            Pago confirmado el{" "}
            {fmtFecha(o.payment_confirmed_at, { day: "2-digit", month: "long" })}
          </p>
        )}
      </div>
    </div>
  );
}
