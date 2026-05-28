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

  const [{ data: rawOrders, error }, { data: { users } }] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id, order_number, channel, status, total, payment_method, created_at,
        customer_id, guest_email,
        customer:profiles!customer_id (full_name, canal)
      `)
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
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

  const orders = (rawOrders ?? []).map((o: any) => ({
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
  }));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Pedidos</h1>
          <p className="text-sm text-neutral-500 mt-1">{orders.length} pedido{orders.length !== 1 ? "s" : ""} en total</p>
        </div>
        <Link
          href="/admin/pedidos/nuevo"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
        >
          + Nuevo pedido
        </Link>
      </div>

      <PedidosClient orders={orders} />
    </div>
  );
}
