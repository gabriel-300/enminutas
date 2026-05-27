import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Detalle de pedido — Portal B2B En Minutas" };
export const revalidate = 0;

const STATUS_MSG: Record<string, { title: string; body: string; color: string }> = {
  pending_payment: {
    title: "Pedido recibido — en revisión",
    body:  "El equipo de En Minutas revisará tu pedido y te confirmará por WhatsApp o email.",
    color: "bg-warning-bg border-warning/30 text-warning",
  },
  aprobado: {
    title: "Pedido aprobado",
    body:  "Tu pedido fue aprobado y pasó a producción.",
    color: "bg-success-bg border-success/30 text-success",
  },
  enviado_prod: {
    title: "En producción",
    body:  "El equipo está preparando tu pedido.",
    color: "bg-success-bg border-success/30 text-success",
  },
  despachado: {
    title: "Despachado",
    body:  "Tu pedido está en camino.",
    color: "bg-success-bg border-success/30 text-success",
  },
  delivered: {
    title: "Entregado",
    body:  "Pedido entregado. ¡Gracias!",
    color: "bg-success-bg border-success/30 text-success",
  },
  cancelled: {
    title: "Cancelado",
    body:  "Este pedido fue cancelado. Contactanos si tenés dudas.",
    color: "bg-danger-bg border-danger/30 text-danger",
  },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);

export default async function B2BPedidoDetailPage({
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
      id, order_number, status, total, subtotal, created_at, notes,
      lines:order_lines (id, quantity, unit_price, line_total, product_snapshot)
    `)
    .eq("id", id)
    .eq("customer_id", user.id)
    .eq("channel", "b2b_mayorista")
    .single();

  if (!order) notFound();

  const o = order as any;
  const msg = STATUS_MSG[o.status];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        href="/b2b/pedidos"
        className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-4 inline-block"
      >
        ← Mis pedidos
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900 font-mono">
            {o.order_number}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {new Date(o.created_at).toLocaleString("es-AR", {
              day: "2-digit", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm font-medium ${msg.color}`}>
          <p className="font-semibold">{msg.title}</p>
          <p className="font-normal mt-0.5 opacity-90">{msg.body}</p>
        </div>
      )}

      {/* Líneas */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700">Productos</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-neutral-100">
              <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Precio u.</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right w-16">Cant.</th>
              <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {(o.lines ?? []).map((line: any) => (
              <tr key={line.id}>
                <td className="px-5 py-3 text-neutral-800">
                  <p>{line.product_snapshot?.name ?? "Producto"}</p>
                  {line.product_snapshot?.unit_label && (
                    <p className="text-xs text-neutral-400">{line.product_snapshot.unit_label}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-right text-neutral-600 tabular-nums">
                  {fmt(Number(line.unit_price))}
                </td>
                <td className="px-5 py-3 text-right text-neutral-600">{line.quantity}</td>
                <td className="px-5 py-3 text-right font-medium text-neutral-900 tabular-nums">
                  {fmt(Number(line.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 max-w-xs ml-auto">
        <div className="flex justify-between font-semibold text-neutral-900">
          <span>Total c/IVA</span>
          <span className="tabular-nums">{fmt(Number(o.total))}</span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">IVA (21%) incluido en todos los precios</p>
      </div>
    </div>
  );
}
