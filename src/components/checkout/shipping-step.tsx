"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CreditCard, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { Button, Input } from "@/components/ui";
import { CheckoutProgress } from "./checkout-progress";

const schema = z.object({
  fullName:   z.string().min(3, "Ingresá tu nombre completo"),
  email:      z.email("Email inválido"),
  phone:      z.string().min(8, "Teléfono inválido"),
  street:     z.string().min(3, "Ingresá la calle"),
  number:     z.string().min(1, "Ingresá el número"),
  city:       z.string().min(2, "Ingresá la ciudad"),
  province:   z.string().min(2, "Ingresá la provincia"),
  postalCode: z.string().length(4, "El CP debe tener 4 dígitos"),
  paymentMethod: z.enum(["mercadopago", "bank_transfer"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ShippingStep() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: "mercadopago" },
  });

  const paymentMethod = watch("paymentMethod");
  const shippingFee = 4500;
  const total = subtotal() + shippingFee;

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          items,
          shippingFee,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? "Error al crear el pedido. Intentá de nuevo.");
        return;
      }

      const { orderId, orderNumber, initPoint, total: orderTotal } = json as {
        orderId: string;
        orderNumber: string;
        initPoint: string | null;
        total: number;
      };

      if (data.paymentMethod === "mercadopago") {
        if (initPoint) {
          window.location.href = initPoint;
        } else {
          // MP not configured in this environment — go to confirmation directly
          router.push(
            `/checkout/confirmacion/${orderId}?method=mp&number=${encodeURIComponent(orderNumber)}&total=${Math.round(orderTotal)}`
          );
        }
      } else {
        clearCart();
        router.push(
          `/checkout/confirmacion/${orderId}?method=transfer&number=${encodeURIComponent(orderNumber)}&total=${Math.round(orderTotal)}`
        );
      }
    } catch {
      setApiError("Error de red. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // Redirect to store happens in useEffect to avoid calling router during SSG
  useEffect(() => {
    if (items.length === 0) router.push("/tienda");
  }, [items.length, router]);

  if (items.length === 0) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <CheckoutProgress current={2} />

      <h1 className="font-display text-2xl font-semibold text-neutral-900 mb-6">
        Datos de envío y pago
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Datos personales */}
          <section className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-neutral-800">Datos de contacto</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Nombre completo" error={errors.fullName?.message} {...register("fullName")} />
              <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
              <Input label="Teléfono" type="tel" placeholder="+54 9 ..." error={errors.phone?.message} {...register("phone")} />
            </div>
          </section>

          {/* Dirección */}
          <section className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-neutral-800">Dirección de entrega</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Calle" error={errors.street?.message} {...register("street")} />
              <Input label="Número" error={errors.number?.message} {...register("number")} />
              <Input label="Ciudad" error={errors.city?.message} {...register("city")} />
              <Input label="Provincia" error={errors.province?.message} {...register("province")} />
              <Input label="Código postal (4 dígitos)" maxLength={4} error={errors.postalCode?.message} {...register("postalCode")} />
            </div>
            <Input
              label="Referencia o instrucciones (opcional)"
              placeholder="Piso, depto, portón…"
              {...register("notes")}
            />
          </section>

          {/* Método de pago */}
          <section className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-semibold text-neutral-800">Método de pago</h2>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                paymentMethod === "mercadopago"
                  ? "border-dorado-500 bg-dorado-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                value="mercadopago"
                {...register("paymentMethod")}
                className="mt-0.5 accent-dorado-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-dorado-600" />
                  <p className="font-semibold text-neutral-900">Mercado Pago</p>
                  <span className="text-xs bg-dorado-100 text-dorado-700 px-2 py-0.5 rounded-full font-medium">
                    Recomendado
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mt-1">
                  Débito, crédito, QR o saldo MP. Acreditación inmediata.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                paymentMethod === "bank_transfer"
                  ? "border-tierra-700 bg-tierra-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                value="bank_transfer"
                {...register("paymentMethod")}
                className="mt-0.5 accent-tierra-700"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-tierra-700" />
                  <p className="font-semibold text-neutral-900">Transferencia bancaria</p>
                </div>
                <p className="text-sm text-neutral-500 mt-1">
                  CVU/CBU a nuestra cuenta. Confirmación manual en hasta 2 hs hábiles.
                  Transferí el monto exacto con el número de pedido como concepto.
                </p>
              </div>
            </label>
          </section>
        </div>

        {/* Resumen lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sticky top-24">
            <h2 className="font-semibold text-neutral-900 mb-4">Resumen</h2>

            <div className="flex flex-col gap-2 text-sm text-neutral-600">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between">
                  <span className="truncate max-w-[140px]">
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 mt-4 pt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal())}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Correo Argentino (est.)</span>
                <span>{formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-900 text-base mt-1">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {apiError && (
              <p className="text-sm text-danger text-center mt-4">{apiError}</p>
            )}
            <Button
              variant="gold"
              size="lg"
              type="submit"
              loading={submitting}
              className="w-full mt-5"
            >
              {paymentMethod === "mercadopago" ? "Pagar con MP" : "Confirmar pedido"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
