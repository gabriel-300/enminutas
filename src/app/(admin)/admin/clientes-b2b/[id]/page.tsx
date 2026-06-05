import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/badge";
import { fmtFechaLarga, fmtFechaSolo } from "@/lib/fecha";
import { DireccionesClient } from "./direcciones-client";

export const metadata: Metadata = { title: "Historial de cliente — Admin En Minutas" };
export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  activo:      "Activo",
  pendiente:   "Pendiente",
  desactivado: "Desactivado",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default async function ClienteB2BDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase    = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profileRaw },
    { data: authUserData },
    { data: ordersRaw },
    { data: direccionesRaw },
    { data: zonasRaw },
  ] = await Promise.all([
    (adminClient as any)
      .from("profiles")
      .select("id, full_name, descuento_extra_pct, b2b_status, created_at, phone, document_number, canal:canales!canal_id (nombre, descuento_pct)")
      .eq("id", id)
      .single(),
    adminClient.auth.admin.getUserById(id),
    (adminClient as any)
      .from("orders")
      .select("id, order_number, status, total, created_at, payment_confirmed_at")
      .eq("customer_id", id)
      .eq("channel", "b2b_mayorista")
      .order("created_at", { ascending: false }),
    (adminClient as any)
      .from("direcciones_entrega")
      .select("id, alias, calle, numero, piso, ciudad, es_principal, zona_id, zona:delivery_zones!zona_id (name, flete_kg)")
      .eq("profile_id", id)
      .eq("activo", true)
      .order("es_principal", { ascending: false }),
    (adminClient as any)
      .from("delivery_zones")
      .select("id, name, flete_kg")
      .order("name"),
  ]);

  if (!profileRaw) notFound();

  const profile   = profileRaw as any;
  const authUser  = authUserData?.user;
  const orders    = (ordersRaw ?? []) as any[];
  const canal     = profile.canal as { nombre: string; descuento_pct: number } | null;
  const direcciones = (direccionesRaw ?? []) as any[];
  const zonas       = (zonasRaw ?? []) as { id: string; name: string; flete_kg: number }[];

  const totalFacturado = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s: number, o: any) => s + Number(o.total), 0);

  const pedidosConfirmados = orders.filter((o: any) => o.payment_confirmed_at).length;

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/clientes-b2b"
        className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-4 inline-block"
      >
        ← Clientes B2B
      </Link>

      <h1 className="text-2xl font-semibold font-display text-neutral-900 mb-6">
        {profile.full_name ?? authUser?.email ?? "Cliente"}
      </h1>

      {/* Datos + Métricas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Datos</p>
          <div>
            <p className="text-xs text-neutral-400">Email</p>
            <p className="text-sm text-neutral-900">{authUser?.email ?? "—"}</p>
          </div>
          {profile.phone && (
            <div>
              <p className="text-xs text-neutral-400">Teléfono</p>
              <p className="text-sm text-neutral-900">{profile.phone}</p>
            </div>
          )}
          {profile.document_number && (
            <div>
              <p className="text-xs text-neutral-400">CUIT</p>
              <p className="text-sm text-neutral-900 font-mono">{profile.document_number}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-neutral-400">Canal</p>
            <p className="text-sm font-medium text-neutral-900">
              {canal?.nombre ?? "—"}
              {canal?.descuento_pct != null && canal.descuento_pct > 0 && (
                <span className="text-neutral-400 ml-1 font-normal">· −{canal.descuento_pct}%</span>
              )}
              {profile.descuento_extra_pct > 0 && (
                <span className="text-success ml-1 font-normal">+{profile.descuento_extra_pct}% extra</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Estado</p>
            <p className="text-sm font-medium text-neutral-900">
              {STATUS_LABEL[profile.b2b_status] ?? profile.b2b_status}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Cliente desde</p>
            <p className="text-sm text-neutral-900">{fmtFechaLarga(profile.created_at)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Resumen</p>
          <div>
            <p className="text-xs text-neutral-400">Total pedidos</p>
            <p className="text-2xl font-semibold font-display text-neutral-900">{orders.length}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Pagos confirmados</p>
            <p className="text-2xl font-semibold font-display text-neutral-900">{pedidosConfirmados}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Total facturado</p>
            <p className="text-2xl font-semibold font-display text-tierra-700">{fmt(totalFacturado)}</p>
          </div>
        </div>
      </div>

      {/* Direcciones de entrega */}
      <div className="mb-6">
        <DireccionesClient
          profileId={id}
          direcciones={direcciones}
          zonas={zonas}
        />
      </div>

      {/* Historial de pedidos */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700">Historial de pedidos</p>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-12">Este cliente no tiene pedidos aún.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-neutral-100">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Nro.</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Fecha</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Estado</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="font-mono text-xs text-tierra-700 hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-500 text-xs">{fmtFechaSolo(o.created_at)}</td>
                  <td className="px-5 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right font-medium text-neutral-900 tabular-nums">
                    {fmt(Number(o.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
