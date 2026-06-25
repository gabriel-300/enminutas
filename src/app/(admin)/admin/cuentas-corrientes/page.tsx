import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertCircle, TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = { title: "Cuentas Corrientes — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function saldoColor(saldo: number, limite: number) {
  if (saldo <= 0) return { text: "text-emerald-600", bg: "bg-emerald-50" };
  if (limite > 0 && saldo >= limite * 0.9) return { text: "text-red-600", bg: "bg-red-50" };
  if (limite > 0 && saldo >= limite * 0.7) return { text: "text-amber-600", bg: "bg-amber-50" };
  return { text: "text-neutral-800", bg: "bg-neutral-50" };
}

export default async function CuentasCorrientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  // Clientes B2B aprobados
  const { data: cuentas } = await db
    .from("b2b_accounts")
    .select("profile_id, business_name, cuit, credit_limit")
    .eq("status", "approved")
    .order("business_name");

  const clienteIds = ((cuentas ?? []) as any[]).map((c: any) => c.profile_id);

  // Todos los movimientos de esos clientes
  let movimientosPorCliente: Record<string, number> = {};
  if (clienteIds.length > 0) {
    const { data: movs } = await db
      .from("cc_movimientos")
      .select("cliente_id, monto")
      .in("cliente_id", clienteIds);

    for (const m of (movs ?? []) as any[]) {
      movimientosPorCliente[m.cliente_id] =
        (movimientosPorCliente[m.cliente_id] ?? 0) + Number(m.monto);
    }
  }

  const filas = ((cuentas ?? []) as any[]).map((c: any) => ({
    ...c,
    saldo:  movimientosPorCliente[c.profile_id] ?? 0,
    limite: Number(c.credit_limit ?? 0),
  }));

  const totalDeuda    = filas.reduce((s, f) => s + Math.max(0, f.saldo), 0);
  const clientesDeuda = filas.filter(f => f.saldo > 0).length;
  const enRiesgo      = filas.filter(f => f.limite > 0 && f.saldo >= f.limite * 0.9).length;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Cuentas Corrientes</h1>
        <p className="text-sm text-neutral-400 mt-1">Saldos y límites de crédito por cliente B2B</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Deuda total</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums">{fmt(totalDeuda)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Users className="size-3" /> Con saldo deudor
          </p>
          <p className="text-2xl font-bold text-neutral-900">{clientesDeuda}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <AlertCircle className="size-3 text-red-500" /> En riesgo
          </p>
          <p className="text-2xl font-bold text-red-600">{enRiesgo}</p>
          <p className="text-xs text-neutral-400 mt-0.5">≥90% del límite</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cliente</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">CUIT</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Saldo</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Límite</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Uso</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-400">
                  No hay clientes B2B aprobados aún.
                </td>
              </tr>
            )}
            {filas.map(f => {
              const col  = saldoColor(f.saldo, f.limite);
              const uso  = f.limite > 0 ? Math.min(100, Math.round((f.saldo / f.limite) * 100)) : null;
              return (
                <tr key={f.profile_id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-neutral-900">{f.business_name}</td>
                  <td className="px-5 py-3.5 text-neutral-500 tabular-nums">{f.cuit}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${col.bg} ${col.text}`}>
                      {fmt(f.saldo)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-neutral-600 tabular-nums">
                    {f.limite > 0 ? fmt(f.limite) : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {uso !== null ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${uso >= 90 ? "bg-red-500" : uso >= 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${uso}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-500 tabular-nums w-8 text-right">{uso}%</span>
                      </div>
                    ) : (
                      <span className="text-neutral-300 text-xs">sin límite</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/cuentas-corrientes/${f.profile_id}`}
                      className="text-xs font-medium text-[#16233f] hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
