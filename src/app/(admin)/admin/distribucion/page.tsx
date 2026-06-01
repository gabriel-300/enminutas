import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConfirmarEntregaButton } from "@/components/admin/confirmar-entrega-button";
import { fmtFecha } from "@/lib/fecha";

export const metadata: Metadata = { title: "Distribución — Admin En Minutas" };
export const revalidate = 0;

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function BadgeDias({ dias }: { dias: number | null }) {
  if (dias === null) return null;
  if (dias > 3) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-bg text-danger">
      {dias}d en tránsito
    </span>
  );
  if (dias >= 1) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-bg text-warning">
      {dias}d en tránsito
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500">
      Hoy
    </span>
  );
}

export default async function DistribucionPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const [{ data: orders }, { data: entregadosHoy }] = await Promise.all([
    (adminClient as any)
      .from("orders")
      .select(`
        id, order_number, status, created_at, despachado_at,
        shipping_snapshot,
        customer:profiles!customer_id (full_name, phone, zona:delivery_zones!zona_id (name)),
        guest_phone,
        lines:order_lines (quantity, product_snapshot)
      `)
      .eq("channel", "b2b_mayorista")
      .eq("status", "despachado")
      .order("despachado_at", { ascending: true }),

    (adminClient as any)
      .from("orders")
      .select(`
        id, order_number, entregado_at,
        customer:profiles!customer_id (full_name, zona:delivery_zones!zona_id (name)),
        lines:order_lines (quantity, product_snapshot)
      `)
      .eq("channel", "b2b_mayorista")
      .eq("status", "delivered")
      .gte("entregado_at", hoyInicio.toISOString())
      .order("entregado_at", { ascending: false }),
  ]);

  const lista         = (orders ?? []) as any[];
  const listaHoy      = (entregadosHoy ?? []) as any[];

  // Agrupar por zona, "Sin zona" al final
  const byZone: Record<string, any[]> = {};
  for (const order of lista) {
    const zoneName = order.customer?.zona?.name ?? "Sin zona asignada";
    if (!byZone[zoneName]) byZone[zoneName] = [];
    byZone[zoneName].push(order);
  }
  const zoneNames = Object.keys(byZone).sort((a, b) => {
    if (a === "Sin zona asignada") return 1;
    if (b === "Sin zona asignada") return -1;
    return a.localeCompare(b, "es");
  });
  const multipleZones = zoneNames.length > 1;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Distribución</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {lista.length === 0
              ? "No hay pedidos en tránsito."
              : `${lista.length} pedido${lista.length !== 1 ? "s" : ""} despachado${lista.length !== 1 ? "s" : ""} pendiente${lista.length !== 1 ? "s" : ""} de entrega`}
          </p>
        </div>
        {lista.length > 0 && (
          <Link
            href="/admin/distribucion/hoja-de-ruta"
            target="_blank"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            🗺️ Hoja de ruta
          </Link>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay pedidos despachados pendientes de entrega.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {zoneNames.map((zoneName) => (
            <div key={zoneName}>
              {multipleZones && (
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                  {zoneName} · {byZone[zoneName].length} pedido{byZone[zoneName].length !== 1 ? "s" : ""}
                </p>
              )}
              <div className="space-y-3">
                {byZone[zoneName].map((order) => {
                  const phone      = order.customer?.phone ?? order.guest_phone;
                  const phoneClean = phone?.replace(/\D/g, "");
                  const address    = order.shipping_snapshot
                    ? [
                        order.shipping_snapshot.street,
                        order.shipping_snapshot.number,
                        order.shipping_snapshot.city,
                      ].filter(Boolean).join(", ")
                    : null;
                  const dias = diasDesde(order.despachado_at);

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border p-5 ${dias !== null && dias > 3 ? "border-danger/40" : "border-neutral-200"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">

                          {/* Header */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-mono text-sm font-semibold text-neutral-900">
                              {order.order_number}
                            </span>
                            <span className="text-sm font-medium text-neutral-700">
                              {order.customer?.full_name ?? "—"}
                            </span>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <BadgeDias dias={dias} />
                          </div>

                          {/* Teléfono + WhatsApp */}
                          {phone && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-neutral-500">{phone}</span>
                              <a
                                href={`https://wa.me/${phoneClean}`}
                                target="_blank"
                                rel="noopener"
                                className="text-xs !text-green-600 hover:underline"
                              >
                                WhatsApp
                              </a>
                            </div>
                          )}

                          {/* Dirección */}
                          {address && (
                            <p className="text-xs text-neutral-500 mb-2">{address}</p>
                          )}

                          {/* Fecha despacho */}
                          {order.despachado_at && (
                            <p className="text-xs text-neutral-400 mb-3">
                              Despachado:{" "}
                              {fmtFecha(order.despachado_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}

                          {/* Líneas */}
                          <ul className="space-y-0.5">
                            {(order.lines ?? []).map((line: any, i: number) => (
                              <li key={i} className="flex items-baseline gap-2 text-sm text-neutral-600">
                                <span className="font-semibold tabular-nums w-6 shrink-0 text-right text-neutral-800">
                                  {line.quantity}×
                                </span>
                                <span>{line.product_snapshot?.name ?? "Producto"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <ConfirmarEntregaButton orderId={order.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entregados hoy */}
      {listaHoy.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            Entregados hoy · {listaHoy.length} pedido{listaHoy.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {listaHoy.map((order: any) => (
              <div key={order.id} className="bg-white rounded-2xl border border-neutral-100 p-4 opacity-75">
                <div className="flex items-center gap-3">
                  <span className="text-success text-sm">✓</span>
                  <span className="font-mono text-xs text-neutral-500">{order.order_number}</span>
                  <span className="text-sm font-medium text-neutral-700">{order.customer?.full_name ?? "—"}</span>
                  {order.customer?.zona && (
                    <span className="text-xs text-neutral-400">· {order.customer.zona.name}</span>
                  )}
                </div>
                <div className="mt-1 pl-6">
                  <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {(order.lines ?? []).map((line: any, i: number) => (
                      <li key={i} className="text-xs text-neutral-400">
                        {line.quantity}× {line.product_snapshot?.name ?? "Producto"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
