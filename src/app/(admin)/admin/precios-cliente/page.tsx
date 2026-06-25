import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tag } from "lucide-react";

export const metadata: Metadata = { title: "Precios por cliente — Admin" };
export const revalidate = 0;

export default async function PreciosClientePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: cuentas } = await db
    .from("b2b_accounts")
    .select("profile_id, business_name, cuit")
    .eq("status", "approved")
    .order("business_name");

  const clienteIds = ((cuentas ?? []) as any[]).map((c: any) => c.profile_id);

  // Contar overrides por cliente
  let conteoPorCliente: Record<string, number> = {};
  if (clienteIds.length > 0) {
    const { data: precios } = await db
      .from("precios_cliente")
      .select("cliente_id")
      .in("cliente_id", clienteIds);

    for (const p of (precios ?? []) as any[]) {
      conteoPorCliente[p.cliente_id] = (conteoPorCliente[p.cliente_id] ?? 0) + 1;
    }
  }

  const filas = ((cuentas ?? []) as any[]).map((c: any) => ({
    ...c,
    overrides: conteoPorCliente[c.profile_id] ?? 0,
  }));

  const totalConOverrides = filas.filter(f => f.overrides > 0).length;
  const totalOverrides    = filas.reduce((s, f) => s + f.overrides, 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Precios por cliente</h1>
        <p className="text-sm text-neutral-400 mt-1">Acuerdos de precio negociados individualmente</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Clientes con acuerdos</p>
          <p className="text-2xl font-bold text-neutral-900">{totalConOverrides}</p>
          <p className="text-xs text-neutral-400 mt-0.5">de {filas.length} activos</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Precios especiales</p>
          <p className="text-2xl font-bold text-neutral-900">{totalOverrides}</p>
          <p className="text-xs text-neutral-400 mt-0.5">overrides totales</p>
        </div>
        <div className="bg-[#16233f] rounded-2xl p-5 flex items-center gap-3">
          <Tag className="size-6 text-white/60 shrink-0" />
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wide mb-0.5">Tipos</p>
            <p className="text-sm text-white font-medium">Precio fijo · Descuento %</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cliente</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">CUIT</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wide">Precios especiales</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filas.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-neutral-400">No hay clientes B2B aprobados.</td></tr>
            )}
            {filas.map(f => (
              <tr key={f.profile_id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-neutral-900">{f.business_name}</td>
                <td className="px-5 py-3.5 text-neutral-500 tabular-nums">{f.cuit}</td>
                <td className="px-5 py-3.5 text-center">
                  {f.overrides > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                      <Tag className="size-3" /> {f.overrides} producto{f.overrides !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-300">precio estándar</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/admin/precios-cliente/${f.profile_id}`}
                    className="text-xs font-medium text-[#16233f] hover:underline"
                  >
                    {f.overrides > 0 ? "Gestionar →" : "Agregar →"}
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
