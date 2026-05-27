import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/badge";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { AprobarPedidoButton } from "@/components/admin/aprobar-pedido-button";

export const metadata: Metadata = { title: "Detalle de pedido — Admin En Minutas" };
export const revalidate = 0;

export default async function AdminPedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, channel, total, subtotal, shipping_fee, discount,
      payment_method, payment_declared_at, payment_confirmed_at,
      shipping_method, shipping_snapshot, notes, created_at,
      guest_email, guest_phone,
      customer:profiles!customer_id (full_name, phone),
      lines:order_lines (
        id, quantity, unit_price, line_total,
        product_snapshot
      )
    `)
    .eq("id", id)
    .single();

  if (!order) notFound();

  const o = order as any;

  const paymentLabel: Record<string, string> = {
    bank_transfer:    "Transferencia bancaria",
    transferencia:    "Transferencia bancaria",
    mercado_pago:     "Mercado Pago",
    cash:             "Efectivo",
    efectivo:         "Efectivo",
    cheque:           "Cheque",
    cuenta_corriente: "Cuenta corriente",
  };

  const shippingLabel: Record<string, string> = {
    delivery:         "Envío a domicilio",
    pickup:           "Retiro en punto",
    national_shipping: "Envío nacional",
    b2b_despacho:     "Despacho B2B",
  };

  const customerName = o.customer?.full_name ?? "Invitado";
  const customerPhone = o.customer?.phone ?? o.guest_phone;
  const customerEmail = o.guest_email;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/admin/pedidos"
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-2 inline-block"
          >
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">
            {o.order_number}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {new Date(o.created_at).toLocaleString("es-AR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={o.status} />
          {o.channel === "b2b_mayorista" && o.status === "pending_payment" && (
            <AprobarPedidoButton orderId={o.id} />
          )}
          <div className="w-48">
            <OrderStatusSelect orderId={o.id} currentStatus={o.status} channel={o.channel} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Cliente */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">Cliente</p>
          <p className="text-sm font-medium text-neutral-900">{customerName}</p>
          {customerEmail && <p className="text-sm text-neutral-500 mt-1">{customerEmail}</p>}
          {customerPhone && <p className="text-sm text-neutral-500 mt-1">{customerPhone}</p>}
        </div>

        {/* Pago */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">Pago</p>
          <p className="text-sm font-medium text-neutral-900">
            {paymentLabel[o.payment_method] ?? o.payment_method}
          </p>
          {o.payment_declared_at && (
            <p className="text-xs text-neutral-500 mt-1">
              Declarado:{" "}
              {new Date(o.payment_declared_at).toLocaleString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {o.payment_confirmed_at && (
            <p className="text-xs text-success mt-1">
              Confirmado:{" "}
              {new Date(o.payment_confirmed_at).toLocaleString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {!o.payment_declared_at && !o.payment_confirmed_at && (
            <p className="text-xs text-neutral-400 mt-1">Sin confirmar</p>
          )}
        </div>

        {/* Envío */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">Envío</p>
          <p className="text-sm font-medium text-neutral-900">
            {shippingLabel[o.shipping_method] ?? o.shipping_method}
          </p>
          {o.shipping_snapshot && (
            <p className="text-xs text-neutral-500 mt-1">
              {[
                o.shipping_snapshot.street,
                o.shipping_snapshot.number,
                o.shipping_snapshot.city,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Líneas del pedido */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700">Productos</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-neutral-100">
              <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Precio u.</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right w-20">Cant.</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {(o.lines ?? []).map((line: any) => (
              <tr key={line.id}>
                <td className="px-5 py-3 text-neutral-800">
                  {line.product_snapshot?.name ?? "Producto"}
                  {line.product_snapshot?.sku && (
                    <span className="ml-2 text-xs text-neutral-400 font-mono">
                      {line.product_snapshot.sku}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right text-neutral-600">
                  $ {Number(line.unit_price).toLocaleString("es-AR")}
                </td>
                <td className="px-5 py-3 text-right text-neutral-600">{line.quantity}</td>
                <td className="px-5 py-3 text-right font-medium text-neutral-900">
                  $ {Number(line.line_total).toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 max-w-xs ml-auto">
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

      {o.notes && (
        <div className="mt-4 bg-warning-bg rounded-2xl border border-warning/20 p-4">
          <p className="text-xs font-medium text-warning mb-1">Nota del cliente</p>
          <p className="text-sm text-neutral-700">{o.notes}</p>
        </div>
      )}
    </div>
  );
}
