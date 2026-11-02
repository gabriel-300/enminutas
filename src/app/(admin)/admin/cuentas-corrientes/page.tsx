import { fmt } from "@/lib/format";
import { fmtFechaSolo } from "@/lib/fecha";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertCircle, CalendarClock, Users } from "lucide-react";

export const metadata: Metadata = { title: "Deuda de clientes — Admin" };
export const revalidate = 0;

export default async function DeudaClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;
  const { data, error } = await db.rpc("deuda_clientes");

  const filas = ((data ?? []) as any[]).map(c => ({
    id:      c.cliente_id as string,
    nombre:  (c.nombre ?? "Sin nombre") as string,
    cuit:    (c.cuit ?? "—") as string,
    plazo:   Number(c.plazo_dias ?? 30),
    pedidos: Number(c.pedidos ?? 0),
    saldo:   Number(c.saldo),
    vencido: Number(c.vencido),
    proximo: (c.proximo_vencimiento ?? null) as string | null,
    ultimoPago: (c.ultimo_pago ?? null) as string | null,
  }));

  const deudaTotal = filas.reduce((s, f) => s + Math.max(0, f.saldo), 0);
  const vencidoTot = filas.reduce((s, f) => s + f.vencido, 0);
  const conDeuda   = filas.filter(f => f.saldo > 0.5).length;

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Deuda de clientes</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Pedidos entregados o despachados sin liquidar, menos los cobros registrados. Es la deuda según lo cargado:
          un cobro que no se registró en el sistema sigue figurando como deuda.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          No se pudo calcular la deuda: {error.message}. ¿Se ejecutó la migración 20261102160000_deuda_clientes?
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs text-neutral-600 mb-1">Deuda de clientes</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums">{fmt(deudaTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs text-neutral-600 mb-1 flex items-center gap-1">
            <AlertCircle className="size-3 text-danger" /> Vencido
          </p>
          <p className="text-2xl font-bold text-danger tabular-nums">{fmt(vencidoTot)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs text-neutral-600 mb-1 flex items-center gap-1">
            <Users className="size-3" /> Clientes con deuda
          </p>
          <p className="text-2xl font-bold text-neutral-900">{conDeuda}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-600">Cliente</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-600">CUIT</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Plazo</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Pedidos</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Saldo</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Vencido</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Próx. vencimiento</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Último pago</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-neutral-600">
                  No hay clientes con deuda.
                </td>
              </tr>
            )}
            {filas.map(f => (
              <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-neutral-900">{f.nombre}</td>
                <td className="px-5 py-3.5 text-neutral-600 tabular-nums">{f.cuit}</td>
                <td className="px-5 py-3.5 text-right text-neutral-600 tabular-nums">{f.plazo > 0 ? `${f.plazo} d` : "contado"}</td>
                <td className="px-5 py-3.5 text-right text-neutral-600 tabular-nums">{f.pedidos || "—"}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                    f.saldo > 0.5 ? "bg-warning-bg text-warning" : "bg-success-bg text-success"
                  }`}>
                    {f.saldo < -0.5 ? `${fmt(Math.abs(f.saldo))} a favor` : fmt(Math.max(0, f.saldo))}
                  </span>
                </td>
                <td className={`px-5 py-3.5 text-right tabular-nums ${f.vencido > 0 ? "text-danger font-semibold" : "text-neutral-500"}`}>
                  {f.vencido > 0 ? fmt(f.vencido) : "—"}
                </td>
                <td className="px-5 py-3.5 text-right text-neutral-600 tabular-nums">
                  {f.proximo ? (
                    <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />{fmtFechaSolo(f.proximo)}</span>
                  ) : "—"}
                </td>
                <td className="px-5 py-3.5 text-right text-neutral-600 tabular-nums">
                  {f.ultimoPago ? fmtFechaSolo(f.ultimoPago) : "sin pagos"}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/clientes-b2b/${f.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
