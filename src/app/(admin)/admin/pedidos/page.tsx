import { listAllUsers } from "@/lib/supabase/users";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PedidosClient } from "@/components/admin/pedidos-client";

export const metadata: Metadata = { title: "Pedidos — Admin En Minutas" };

export const revalidate = 0;

export default async function AdminPedidosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const esVendedor = user.app_metadata?.role === "vendedor";
  const esAdmin    = user.app_metadata?.role === "admin";

  // Si es vendedor, filtrar solo pedidos de sus clientes asignados
  let clienteIds: string[] | null = null;
  if (esVendedor) {
    const { data: misClientes } = await (adminClient as any)
      .from("profiles")
      .select("id")
      .eq("vendedor_id", user.id);
    clienteIds = (misClientes ?? []).map((c: any) => c.id as string);
  }

  let ordersQuery = (adminClient as any)
    .from("orders")
    .select(`
      id, order_number, channel, status, total, payment_method, created_at,
      customer_id, guest_email, origen_order_id,
      customer:profiles!customer_id (full_name, canal, vendedor_id)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (clienteIds !== null) {
    if (clienteIds.length === 0) {
      // Vendedor sin clientes asignados: no tiene pedidos para ver
      ordersQuery = ordersQuery.in("customer_id", [] as string[]).limit(0);
    } else {
      ordersQuery = ordersQuery.in("customer_id", clienteIds);
    }
  }

  const [{ data: rawOrders, error }, users] = await Promise.all([
    ordersQuery,
    listAllUsers(),
  ]);

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar pedidos: {error.message}
      </div>
    );
  }

  const emailMap: Record<string, string> = Object.fromEntries(
    (users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  // Resolver nombres de vendedores en un solo query
  const vendedorIds = [...new Set(
    (rawOrders ?? [])
      .map((o: any) => o.customer?.vendedor_id as string | undefined)
      .filter(Boolean)
  )] as string[];

  let vendedorNombreMap: Record<string, string> = {};
  if (vendedorIds.length > 0) {
    const { data: vendedores } = await (adminClient as any)
      .from("profiles")
      .select("id, full_name")
      .in("id", vendedorIds);
    vendedorNombreMap = Object.fromEntries(
      (vendedores ?? []).map((v: any) => [v.id, v.full_name ?? ""])
    );
  }

  // Faltantes reprogramados: cada pedido con entrega parcial apunta al pedido que lleva su faltante, y viceversa
  const numeroPorId = new Map<string, string>((rawOrders ?? []).map((o: any) => [o.id as string, o.order_number as string]));
  const origenesFuera = [...new Set(
    (rawOrders ?? []).map((o: any) => o.origen_order_id as string | null).filter((id: string | null): id is string => !!id && !numeroPorId.has(id))
  )];
  if (origenesFuera.length > 0) {
    const { data: origenes } = await (adminClient as any).from("orders").select("id, order_number").in("id", origenesFuera);
    for (const x of (origenes ?? []) as any[]) numeroPorId.set(x.id, x.order_number);
  }
  const reprogramadoDe = new Map<string, { id: string; order_number: string }>();
  for (const o of (rawOrders ?? []) as any[]) {
    if (o.origen_order_id && o.status !== "cancelled") reprogramadoDe.set(o.origen_order_id, { id: o.id, order_number: o.order_number });
  }

  const orders = (rawOrders ?? []).map((o: any) => ({
    faltante_de: o.origen_order_id ? { id: o.origen_order_id as string, order_number: numeroPorId.get(o.origen_order_id) ?? "—" } : null,
    faltante_en: reprogramadoDe.get(o.id) ?? null,
    id: o.id,
    order_number: o.order_number,
    channel: o.channel,
    status: o.status,
    total: o.total,
    payment_method: o.payment_method,
    created_at: o.created_at,
    customer_name:  o.customer?.full_name ?? (o.customer_id ? emailMap[o.customer_id] : null) ?? null,
    customer_email: o.guest_email ?? null,
    canal:          (o.customer as any)?.canal ?? null,
    vendedor_name:  o.customer?.vendedor_id ? (vendedorNombreMap[o.customer.vendedor_id] ?? null) : null,
  }));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 md:mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Pedidos</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{orders.length} pedido{orders.length !== 1 ? "s" : ""} en total</p>
        </div>
        <Link
          href="/admin/pedidos/nuevo"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl bg-tierra-700 !text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
        >
          + Nuevo pedido
        </Link>
      </div>

      <PedidosClient orders={orders} esAdmin={esAdmin} />
    </div>
  );
}
