import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/badge";
import { DeclararPagoButton } from "@/components/b2b/declarar-pago-button";
import { ReorderButton } from "@/components/b2b/reorder-button";
import { GuardarPlantillaButton } from "@/components/b2b/guardar-plantilla-button";
import { fmtFechaHora, fmtFecha } from "@/lib/fecha";

export const metadata: Metadata = { title: "Detalle de pedido — Portal B2B En Minutas" };
export const revalidate = 0;

const STATUS_MSG: Record<string, { title: string; body: string; color: string }> = {
  pending_payment: {
    title: "Pedido recibido",
    body:  "Realizá la transferencia con los datos de abajo y luego avisanos con el botón.",
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
      payment_method, payment_declared_at, payment_confirmed_at,
      lines:order_lines (id, quantity, unit_price, line_total, product_snapshot)
    `)
    .eq("id", id)
    .eq("customer_id", user.id)
    .eq("channel", "b2b_mayorista")
    .single();

  if (!order) notFound();

  const o = order as any;
  const msg = STATUS_MSG[o.status];

  const bankCbu    = process.env.NEXT_PUBLIC_BANK_CBU   ?? "";
  const bankAlias  = process.env.NEXT_PUBLIC_BANK_ALIAS ?? "";
  const bankBanco  = "";
  const bankTitular = process.env.NEXT_PUBLIC_BANK_HOLDER ?? "En Minutas";

  const isTransferPayment = o.payment_method === "bank_transfer" || o.payment_method === "transferencia";
  const showBankInfo = o.status === "pending_payment" && isTransferPayment && (bankCbu || bankAlias);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-5 md:py-8">
      <Link
        href="/b2b/pedidos"
        className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-4 inline-block"
      >
        ← Mis pedidos
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900 font-mono">
            {o.order_number}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {fmtFechaHora(o.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={o.status} />
          <Link
            href={`/remito/${o.id}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            Remito
          </Link>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm font-medium ${msg.color}`}>
          <p className="font-semibold">{msg.title}</p>
          <p className="font-normal mt-0.5 opacity-90">{msg.body}</p>
        </div>
      )}

      {/* Datos bancarios */}
      {showBankInfo && (
        <div className="mb-6 bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4">
            Datos para la transferencia
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Titular</p>
              <p className="font-medium text-neutral-900">{bankTitular}</p>
            </div>
            {bankBanco && (
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Banco</p>
                <p className="font-medium text-neutral-900">{bankBanco}</p>
              </div>
            )}
            {bankCbu && (
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">CBU</p>
                <p className="font-mono font-medium text-neutral-900 tracking-wide">{bankCbu}</p>
              </div>
            )}
            {bankAlias && (
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Alias</p>
                <p className="font-medium text-neutral-900">{bankAlias}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-neutral-400 mb-0.5">Referencia / Concepto</p>
              <p className="font-mono text-sm font-semibold text-tierra-700">{o.order_number}</p>
            </div>
          </div>
        </div>
      )}

      {/* Declarar pago — solo para pagos por transferencia */}
      {o.status === "pending_payment" && isTransferPayment && (
        <div className="mb-6">
          {o.payment_declared_at ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-success-bg rounded-xl border border-success/30 text-sm text-success font-medium">
              <span>✓</span>
              <span>
                Pago declarado el{" "}
                {fmtFecha(o.payment_declared_at, { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ) : (
            <DeclararPagoButton orderId={o.id} />
          )}
        </div>
      )}

      {/* Líneas */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700">Productos</p>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-neutral-100">
          {(o.lines ?? []).map((line: any) => (
            <div key={line.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-neutral-800 font-medium leading-snug">
                  {line.product_snapshot?.name ?? "Producto"}
                </p>
                {line.product_snapshot?.unit_label && (
                  <p className="text-xs text-neutral-400">{line.product_snapshot.unit_label}</p>
                )}
                <p className="text-xs text-neutral-400 mt-0.5">
                  {line.quantity} × {fmt(Number(line.unit_price))}
                </p>
              </div>
              <span className="font-semibold text-sm text-neutral-900 tabular-nums shrink-0">
                {fmt(Number(line.line_total))}
              </span>
            </div>
          ))}
        </div>

        {/* Desktop: tabla */}
        <table className="hidden md:table w-full text-sm">
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
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:max-w-xs sm:ml-auto mb-4">
        <div className="flex justify-between font-semibold text-neutral-900">
          <span>Total c/IVA</span>
          <span className="tabular-nums">{fmt(Number(o.total))}</span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">IVA (21%) incluido en todos los precios</p>
      </div>

      {/* Nota del admin (si existe y es relevante para el cliente) */}
      {o.notes && (
        <div className="mt-2 bg-neutral-50 rounded-2xl border border-neutral-200 p-4">
          <p className="text-xs font-medium text-neutral-500 mb-1">Observaciones</p>
          <p className="text-sm text-neutral-700">{o.notes}</p>
        </div>
      )}

      {/* Repetir pedido + plantilla */}
      <div className="mt-6 space-y-0">
        <ReorderButton orderId={o.id} />
        <GuardarPlantillaButton orderId={o.id} />
        <p className="text-xs text-neutral-400 text-center mt-2">
          Se cargan los mismos productos al carrito para que puedas revisar antes de confirmar ·{" "}
          <a href="/b2b/plantillas" className="underline hover:text-neutral-700">Ver mis plantillas</a>
        </p>
      </div>
    </div>
  );
}
