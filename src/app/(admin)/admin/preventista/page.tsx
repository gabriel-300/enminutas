import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Preventista — Admin En Minutas" };
export const revalidate = 0;

const CANAL_LABEL: Record<string, string> = {
  b2b_mayorista: "Mayorista",
  dist:          "Distribuidor",
  gastro:        "Gastronomía",
  min:           "Minorista",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function diasDesde(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function BadgeDias({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-xs text-neutral-300">Sin pedidos</span>;
  if (dias > 30) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-bg text-danger">{dias}d sin comprar</span>;
  if (dias > 15) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-bg text-warning">{dias}d sin comprar</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-success-bg text-success">{dias}d</span>;
}

export default async function PreventistaPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  const esVendedor = role === "vendedor";

  // Clientes B2B activos — si es vendedor, solo los suyos
  let clientesQuery = adminClient
    .from("profiles")
    .select("id, full_name, canal, phone, zona:delivery_zones!zona_id (name), vendedor:profiles!vendedor_id (full_name)")
    .eq("role", "customer_b2b")
    .eq("b2b_status", "activo")
    .order("full_name");

  if (esVendedor) {
    clientesQuery = clientesQuery.eq("vendedor_id", user.id);
  }

  const { data: rawClientes } = await clientesQuery;
  const clientes = (rawClientes ?? []) as any[];

  // Último pedido por cliente
  const clienteIds: string[] = clientes.map((c: any) => c.id);
  let lastOrderMap: Record<string, { id: string; order_number: string; total: number; created_at: string; status: string }> = {};

  if (clienteIds.length > 0) {
    const { data: rawOrders } = await adminClient
      .from("orders")
      .select("id, customer_id, order_number, total, created_at, status")
      .in("customer_id", clienteIds)
      .order("created_at", { ascending: false });

    // Tomar solo el más reciente por cliente
    for (const o of (rawOrders ?? []) as any[]) {
      if (!lastOrderMap[o.customer_id]) {
        lastOrderMap[o.customer_id] = {
          id:           o.id,
          order_number: o.order_number,
          total:        Number(o.total),
          created_at:   o.created_at,
          status:       o.status,
        };
      }
    }
  }

  // Ordenar: más inactivos primero
  const clientesConDias = clientes.map((c: any) => {
    const lastOrder = lastOrderMap[c.id] ?? null;
    const dias = diasDesde(lastOrder?.created_at ?? null);
    return { ...c, lastOrder, dias };
  }).sort((a, b) => {
    if (a.dias === null && b.dias === null) return 0;
    if (a.dias === null) return -1;
    if (b.dias === null) return 1;
    return b.dias - a.dias;
  });

  // Stats
  const total      = clientesConDias.length;
  const inactivos30 = clientesConDias.filter((c) => c.dias === null || c.dias > 30).length;
  const inactivos15 = clientesConDias.filter((c) => c.dias !== null && c.dias > 15 && c.dias <= 30).length;
  const activos     = clientesConDias.filter((c) => c.dias !== null && c.dias <= 15).length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Preventista</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {esVendedor ? "Tus clientes asignados" : "Todos los clientes B2B activos"} — ordenados por inactividad
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-neutral-900">{total}</p>
          <p className="text-xs text-neutral-400 mt-1">Total clientes</p>
        </div>
        <div className="bg-danger-bg rounded-2xl border border-danger/20 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-danger">{inactivos30}</p>
          <p className="text-xs text-danger/70 mt-1">+30 días inactivos</p>
        </div>
        <div className="bg-warning-bg rounded-2xl border border-warning/20 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-warning">{inactivos15}</p>
          <p className="text-xs text-warning/70 mt-1">15–30 días</p>
        </div>
        <div className="bg-success-bg rounded-2xl border border-success/20 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-success">{activos}</p>
          <p className="text-xs text-success/70 mt-1">Activos &lt;15 días</p>
        </div>
      </div>

      {/* Lista de clientes */}
      {clientesConDias.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">
            {esVendedor ? "No tenés clientes asignados todavía." : "No hay clientes B2B activos."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Cliente</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Actividad</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Último pedido</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {clientesConDias.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-neutral-900">{c.full_name ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-400">{CANAL_LABEL[c.canal] ?? c.canal}</span>
                      {c.zona && <span className="text-xs text-neutral-300">· {c.zona.name}</span>}
                      {c.phone && (
                        <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                          className="text-xs !text-green-600 hover:underline">
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <BadgeDias dias={c.dias} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {c.lastOrder ? (
                      <div>
                        <Link href={`/admin/pedidos/${c.lastOrder.id}`}
                          className="text-xs font-mono !text-neutral-500 hover:!text-tierra-700">
                          {c.lastOrder.order_number}
                        </Link>
                        <p className="text-xs font-semibold text-neutral-800 mt-0.5">{fmt(c.lastOrder.total)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {c.lastOrder && (
                        <Link
                          href={`/admin/pedidos/nuevo?cliente=${c.id}&repetir=${c.lastOrder.id}`}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 !text-neutral-600 hover:bg-neutral-50 transition-colors">
                          Repetir pedido
                        </Link>
                      )}
                      <Link
                        href={`/admin/pedidos/nuevo?cliente=${c.id}`}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 !text-white hover:bg-tierra-800 transition-colors">
                        + Pedido
                      </Link>
                    </div>
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
