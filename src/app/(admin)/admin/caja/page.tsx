import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { fmt } from "@/lib/format";
import { getPosicionCaja } from "./actions";
import { SaldoBancoForm } from "./saldo-banco-form";

export const metadata: Metadata = { title: "Posición de caja — Admin En Minutas" };
export const revalidate = 0;

export default async function CajaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "caja") redirect("/admin/dashboard");

  const pos = await getPosicionCaja();

  const filas = [
    { label: "Saldo Banco Macro",        valor: pos.saldoBanco,        signo: "" as const },
    { label: "Cobros confirmados",       valor: pos.cobrosConfirmados, signo: "+" as const },
    { label: "Deuda a proveedores",      valor: pos.deudaProveedores,  signo: "−" as const },
    { label: "Órdenes de pago pendientes", valor: pos.opPendientes,    signo: "−" as const },
  ];

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16 space-y-5 max-w-2xl">
      <PageHeader
        title="Posición de caja"
        subtitle="Saldo Banco Macro + cobros confirmados − deuda a proveedores − órdenes de pago pendientes."
      />

      <Card>
        <CardHeader title="Saldo del banco" />
        <div className="p-5">
          <SaldoBancoForm saldo={pos.saldoBanco} fecha={pos.saldoBancoFecha} notas={pos.saldoBancoNotas} />
          {!pos.saldoBancoFecha && (
            <p className="text-xs text-warning mt-2">
              Cargá el saldo según el home banking para que la posición sea real.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Cálculo" />
        <ul className="divide-y divide-neutral-100">
          {filas.map(f => (
            <li key={f.label} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-neutral-700">{f.label}</span>
              <span className="font-medium tabular-nums text-neutral-900">
                {f.signo}{fmt(Math.abs(f.valor))}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between px-5 py-3.5 bg-neutral-50">
            <span className="font-semibold text-neutral-900">Posición de caja</span>
            <span className={`font-bold text-lg tabular-nums ${pos.posicion < 0 ? "text-danger" : "text-neutral-900"}`}>
              {fmt(pos.posicion)}
            </span>
          </li>
        </ul>
      </Card>

      <p className="text-xs text-neutral-600 px-1">
        "Cobros confirmados" son los pagos de clientes registrados después de la última carga del saldo del banco,
        para no contarlos dos veces. "Órdenes de pago pendientes" incluye las que están en borrador y las ya aprobadas sin pagar.
      </p>
    </div>
  );
}
