import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MetaVendedorCard } from "@/components/admin/meta-vendedor-form";

export const metadata: Metadata = { title: "Preventista — Admin En Minutas" };
export const revalidate = 0;

const CANAL_LABEL: Record<string, string> = {
  b2b_mayorista: "Mayorista", dist: "Distribuidor",
  gastro: "Gastronomía",     min:  "Minorista",
};

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered"];

function diasDesde(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
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

  const role      = user.app_metadata?.role as string | undefined;
  const esAdmin   = role === "admin";
  const esVendedor = role === "vendedor";

  // Mes actual
  const now = new Date();
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const desdeMs = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const hastaMs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // ── Metas de venta ───────────────────────────────────────────────────────
  // Lista de vendedores del sistema
  const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const vendedores = (allUsers ?? [])
    .filter((u: any) => u.app_metadata?.role === "vendedor")
    .map((u: any) => ({
      id:     u.id,
      nombre: u.user_metadata?.full_name ?? u.email ?? u.id,
      email:  u.email,
    }));

  // Vendedores a mostrar en metas: todos (admin) o solo yo (vendedor)
  const vendedoresMeta = esAdmin ? vendedores
    : vendedores.filter((v: any) => v.id === user.id);

  // Metas del mes
  const vendedorIds = vendedoresMeta.map((v: any) => v.id);
  let metaMap: Record<string, number> = {};
  if (vendedorIds.length > 0) {
    const { data: rawGoals } = await adminClient
      .from("sales_goals")
      .select("vendedor_id, objetivo")
      .in("vendedor_id", vendedorIds)
      .eq("mes", mes);
    for (const g of (rawGoals ?? []) as any[]) {
      metaMap[g.vendedor_id] = Number(g.objetivo);
    }
  }

  // Ventas del mes por vendedor: pedidos de clientes asignados a ese vendedor
  // Primero: obtener todos los clientes con vendedor asignado
  const { data: perfilesVendedor } = await adminClient
    .from("profiles")
    .select("id, vendedor_id")
    .in("vendedor_id", vendedorIds.length > 0 ? vendedorIds : ["__none__"]);

  // Agrupar cliente_id → vendedor_id
  const clienteVendedorMap: Record<string, string> = {};
  for (const p of (perfilesVendedor ?? []) as any[]) {
    if (p.vendedor_id) clienteVendedorMap[p.id] = p.vendedor_id;
  }

  const clienteIds = Object.keys(clienteVendedorMap);
  let ventasMap: Record<string, number> = {};

  if (clienteIds.length > 0) {
    const { data: rawOrders } = await adminClient
      .from("orders")
      .select("customer_id, total")
      .in("customer_id", clienteIds)
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desdeMs)
      .lte("created_at", hastaMs);

    for (const o of (rawOrders ?? []) as any[]) {
      const vid = clienteVendedorMap[o.customer_id];
      if (vid) ventasMap[vid] = (ventasMap[vid] ?? 0) + Number(o.total);
    }
  }

  // ── Clientes activos ─────────────────────────────────────────────────────
  let clientesQuery = adminClient
    .from("profiles")
    .select("id, full_name, canal, phone, vendedor_id, zona:delivery_zones!zona_id (name)")
    .eq("role", "customer_b2b")
    .eq("b2b_status", "activo")
    .order("full_name");

  if (esVendedor) clientesQuery = clientesQuery.eq("vendedor_id", user.id);

  const { data: rawClientes } = await clientesQuery;
  const clientes = (rawClientes ?? []) as any[];
  const clienteIds2: string[] = clientes.map((c: any) => c.id);

  // Último pedido por cliente
  let lastOrderMap: Record<string, { id: string; order_number: string; total: number; created_at: string }> = {};
  if (clienteIds2.length > 0) {
    const { data: rawOrders } = await adminClient
      .from("orders")
      .select("id, customer_id, order_number, total, created_at")
      .in("customer_id", clienteIds2)
      .order("created_at", { ascending: false });

    for (const o of (rawOrders ?? []) as any[]) {
      if (!lastOrderMap[o.customer_id]) {
        lastOrderMap[o.customer_id] = {
          id: o.id, order_number: o.order_number,
          total: Number(o.total), created_at: o.created_at,
        };
      }
    }
  }

  // Ordenar por más inactivos primero
  const clientesConDias = clientes.map((c: any) => {
    const lastOrder = lastOrderMap[c.id] ?? null;
    return { ...c, lastOrder, dias: diasDesde(lastOrder?.created_at ?? null) };
  }).sort((a: any, b: any) => {
    if (a.dias === null && b.dias === null) return 0;
    if (a.dias === null) return -1;
    if (b.dias === null) return 1;
    return b.dias - a.dias;
  });

  // Stats
  const total       = clientesConDias.length;
  const inactivos30 = clientesConDias.filter((c: any) => c.dias === null || c.dias > 30).length;
  const inactivos15 = clientesConDias.filter((c: any) => c.dias !== null && c.dias > 15 && c.dias <= 30).length;
  const activos     = clientesConDias.filter((c: any) => c.dias !== null && c.dias <= 15).length;

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Preventista</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {esVendedor ? "Tus clientes asignados" : "Todos los clientes B2B activos"} — ordenados por inactividad
        </p>
      </div>

      {/* Metas del mes */}
      {vendedoresMeta.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            Metas del mes · {new Date(mes + "-01").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>
          <div className={`grid gap-4 ${vendedoresMeta.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2"}`}>
            {vendedoresMeta.map((v: any) => (
              <MetaVendedorCard
                key={v.id}
                vendedorId={v.id}
                vendedorNombre={v.nombre}
                mes={mes}
                ventasMes={ventasMap[v.id] ?? 0}
                objetivo={metaMap[v.id] ?? 0}
                esAdmin={esAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stats de clientes */}
      <div className="grid grid-cols-4 gap-4">
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
          {esVendedor && (
            <p className="text-xs text-neutral-300 mt-1">Un administrador debe asignarte clientes en la sección Clientes B2B.</p>
          )}
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
              {clientesConDias.map((c: any) => (
                <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-neutral-900">{c.full_name ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                        <p className="text-xs font-semibold text-neutral-800 mt-0.5">
                          {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(c.lastOrder.total)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {c.lastOrder && (
                        <Link href={`/admin/pedidos/nuevo?cliente=${c.id}&repetir=${c.lastOrder.id}`}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 !text-neutral-600 hover:bg-neutral-50 transition-colors">
                          Repetir
                        </Link>
                      )}
                      <Link href={`/admin/pedidos/nuevo?cliente=${c.id}`}
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
