"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Copy, MessageCircle, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useCartStore } from "@/store/cart";

const BANK_INFO = {
  cbu:     process.env.NEXT_PUBLIC_BANK_CBU     ?? "000000000000000000000",
  alias:   process.env.NEXT_PUBLIC_BANK_ALIAS   ?? "ENMINUTAS.PETRI.POSADAS",
  holder:  process.env.NEXT_PUBLIC_BANK_HOLDER  ?? "Panadería Petri SA",
  cuit:    process.env.NEXT_PUBLIC_BANK_CUIT    ?? "30-XXXXXXXX-X",
};

export function ConfirmationStep({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const method = searchParams.get("method") ?? "transfer";
  const isTransfer = method === "transfer";

  // order_number (EM-2026-XXXXX) for display; falls back to orderId for dev
  const orderNumber = searchParams.get("number") ?? orderId;
  const totalParam = searchParams.get("total");
  const total = totalParam ? parseInt(totalParam, 10) : 0;

  const clearCart = useCartStore((s) => s.clearCart);

  // Clear cart when MP payment lands here (MP redirects back with method=mp)
  useEffect(() => {
    if (!isTransfer) clearCart();
  }, [isTransfer, clearCart]);

  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="size-16 rounded-full bg-selva-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="size-8 text-selva-700" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-neutral-900">
          {isTransfer ? "¡Pedido recibido!" : "¡Pago confirmado!"}
        </h1>
        <p className="mt-2 text-neutral-500">
          Número de pedido:{" "}
          <strong className="text-neutral-800 font-mono">{orderNumber}</strong>
        </p>
        {!isTransfer && (
          <p className="mt-1 text-sm text-selva-700 font-medium">
            Tu pago fue acreditado. Ya estamos preparando tu pedido.
          </p>
        )}
      </div>

      {/* Instrucciones de transferencia */}
      {isTransfer && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden mb-6">
          <div className="bg-tierra-700 text-white px-5 py-4">
            <h2 className="font-semibold text-lg">Transferí ahora para confirmar</h2>
            <p className="text-tierra-200 text-sm mt-0.5">
              Usá el monto <strong>exacto</strong> con centavos y el número de pedido como concepto.
            </p>
          </div>

          <div className="p-5 flex flex-col gap-3">
            {[
              { label: "CBU",      value: BANK_INFO.cbu,    key: "cbu" },
              { label: "Alias",    value: BANK_INFO.alias,  key: "alias" },
              { label: "Titular",  value: BANK_INFO.holder, key: "holder" },
              { label: "CUIT",     value: BANK_INFO.cuit,   key: "cuit" },
              { label: "Monto exacto", value: total > 0 ? formatCurrency(total) : "—", key: "amount" },
              { label: "Concepto (obligatorio)", value: orderNumber, key: "concept" },
            ].map(({ label, value, key }) => (
              <div
                key={key}
                className="flex items-center justify-between bg-crema-50 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-xs font-mono uppercase tracking-wide text-neutral-400">{label}</p>
                  <p className={`font-semibold text-neutral-900 mt-0.5 ${key === "concept" || key === "cbu" ? "font-mono text-sm" : ""}`}>
                    {value}
                  </p>
                </div>
                <button
                  onClick={() => copy(value, key)}
                  className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                  aria-label={`Copiar ${label}`}
                >
                  {copied === key ? (
                    <CheckCircle className="size-4 text-selva-700" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="px-5 pb-5 bg-warning-bg rounded-b-2xl border-t border-yellow-200">
            <p className="text-sm text-neutral-700 py-3">
              ⚠️ Una vez que transferiste, hacé click en{" "}
              <strong>&ldquo;Ya transferí&rdquo;</strong>. Te notificamos por WhatsApp cuando
              confirmemos el pago (lunes a viernes 8-18 hs).
            </p>
            <Button variant="primary" className="w-full">
              Ya transferí — avisar por WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* WhatsApp CTA */}
      <a
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5493764571529"}?text=${encodeURIComponent(
          `Hola, acabo de hacer el pedido ${orderNumber}. ¿Pueden confirmar?`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-[#25D366] text-white rounded-xl px-5 py-4 mb-4 hover:bg-[#1fb855] transition-colors"
      >
        <MessageCircle className="size-5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">Escribinos por WhatsApp</p>
          <p className="text-xs text-green-100">+54 376 4571529 · Respuesta en horas hábiles</p>
        </div>
        <ArrowRight className="size-4 ml-auto shrink-0" />
      </a>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button variant="ghost" className="flex-1" asChild>
          <Link href="/tienda">Seguir comprando</Link>
        </Button>
        <Button variant="primary" className="flex-1" asChild>
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
