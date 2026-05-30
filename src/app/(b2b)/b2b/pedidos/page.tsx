import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/badge";
import { fmtFechaSolo } from "@/lib/fecha";
import { ReorderButton } from "@/components/b2b/reorder-button";

export const metadata: Metadata = { title: "Mis pedidos — Portal B2B En Minutas" };
export const revalidate = 0;

export default async function B2BPedidosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pedidos } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .eq("customer_id", user.id)
    .eq("channel", "b2b_mayorista")
    .order("created_at", { ascending: false });

  const lista = pedidos ?? [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold font-display text-neutral-900 mb-6">Mis pedidos</h1>

      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-500 text-sm">Todavía no realizaste ningún pedido.</p>
          <Link
            href="/b2b/catalogo"
            className="mt-4 inline-block text-sm font-medium text-tierra-700 hover:underline"
          >
            Ver catálogo →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-5 py-3 font-medium text-neutral-500">Pedido</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Estado</th>
                <th className="px-5 py-3 font-medium text-neutral-500 text-right">Total c/IVA</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Fecha</th>
                <th className="px-5 py-3 font-medium text-neutral-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {lista.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/b2b/pedidos/${p.id}`}
                      className="font-medium text-tierra-700 hover:underline font-mono text-xs"
                    >
                      {p.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <OrderStatusBadge status={p.status as any} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-neutral-900 tabular-nums">
                    {new Intl.NumberFormat("es-AR", {
                      style:                 "currency",
                      currency:              "ARS",
                      maximumFractionDigits: 0,
                    }).format(p.total)}
                  </td>
                  <td className="px-5 py-3 text-neutral-400 text-xs tabular-nums">
                    {fmtFechaSolo(p.created_at)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ReorderButton orderId={p.id} variant="small" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
