import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConfirmarEntregaButton } from "@/components/admin/confirmar-entrega-button";
import { IniciarDistribucionButton } from "@/components/admin/iniciar-distribucion-button";
import { DistribucionZonaFiltro } from "@/components/admin/distribucion-zona-filtro";
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

export default async function DistribucionPage({
  searchParams,
}: {
  searchParams: Promise<{ zona?: string }>;
}) {
  const { zona: zonaParam } = await searchParams;
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Zona asignada al usuario (solo aplica si es rol distribucion)
  const { data: perfilUsuario } = await (adminClient as any)
    .from("profiles")
    .select("zona_id, zona:delivery_zones!zona_id(name)")
    .eq("id", user.id)
    .maybeSingle();

  const zonaFiltro     = perfilUsuario?.zona_id ?? null;
  const zonaNombre     = (perfilUsuario?.zona as any)?.name ?? null;
  const esDistribucion = user.app_metadata?.role === "distribucion";

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const buildQuery = (db: any, status: string | string[]) => {
    let q = db
      .from("orders")
      .select(`
        id, order_number, status, created_at, despachado_at,
        shipping_snapshot,
        customer:profiles!customer_id (full_name, phone, zona:delivery_zones!zona_id (name)),
        guest_phone,
        lines:order_lines (product_id, quantity, product_snapshot)
      `)
      .eq("channel", "b2b_mayorista")
      .in("status", status instanceof Array ? status : [status]);
    if (esDistribucion) {
      // Sin zona asignada: no mostrar ningún pedido
      q = q.eq("delivery_zone_id", zonaFiltro ?? "00000000-0000-0000-0000-000000000000");
    }
    return q;
  };

  const [{ data: orders }, { data: entregadosHoy }] = await Promise.all([
    buildQuery(adminClient as any, ["despachado", "en_distribucion"]).order("despachado_at", { ascending: true }),

    (() => {
      let q = (adminClient as any)
        .from("orders")
        .select(`id, order_number, entregado_at, customer:profiles!customer_id (full_name, zona:delivery_zones!zona_id (name)), lines:order_lines (product_id, quantity, product_snapshot)`)
        .eq("channel", "b2b_mayorista").eq("status", "delivered")
        .gte("entregado_at", hoyInicio.toISOString())
        .order("entregado_at", { ascending: false });
      if (esDistribucion) q = q.eq("delivery_zone_id", zonaFiltro ?? "00000000-0000-0000-0000-000000000000");
      return q;
    })(),
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
  const multipleZones     = zoneNames.length > 1;
  const mostrarFiltro     = !esDistribucion && zoneNames.length > 1;
  const filteredZoneNames = zonaParam
    ? zoneNames.filter((z) => z === zonaParam)
    : zoneNames;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-5 md:mb-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Distribución</h1>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/admin/distribucion/historial"
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Historial</span>
            </Link>
            {lista.length > 0 && (
              <Link
                href="/admin/distribucion/hoja-de-ruta"
                target="_blank"
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="hidden sm:inline">Hoja de ruta</span>
              </Link>
            )}
          </div>
        </div>
        <p className="text-sm text-neutral-500">
          {lista.length === 0
            ? "No hay pedidos en tránsito."
            : `${lista.length} pedido${lista.length !== 1 ? "s" : ""} pendiente${lista.length !== 1 ? "s" : ""} de entrega`}
          {zonaNombre && <span className="ml-2 text-neutral-400">— {zonaNombre}</span>}
        </p>
        {esDistribucion && !zonaFiltro && (
          <p className="text-xs text-warning mt-1">Sin zona asignada — mostrando todos los pedidos.</p>
        )}
      </div>

      {mostrarFiltro && (
        <DistribucionZonaFiltro zonas={zoneNames} />
      )}

      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay pedidos despachados pendientes de entrega.</p>
        </div>
      ) : filteredZoneNames.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay pedidos para la zona seleccionada.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredZoneNames.map((zoneName) => (
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
                      className={`bg-white rounded-2xl border p-4 md:p-5 ${dias !== null && dias > 3 ? "border-danger/40" : "border-neutral-200"}`}
                    >
                      {/* Header: número + cliente */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-mono text-sm font-semibold text-neutral-900">
                          {order.order_number}
                        </span>
                        <span className="text-sm font-medium text-neutral-700">
                          {order.customer?.full_name ?? "—"}
                        </span>
                        <BadgeDias dias={dias} />
                      </div>

                      {/* Teléfono + WhatsApp */}
                      {phone && (
                        <div className="flex items-center gap-3 mb-1">
                          <a href={`tel:${phoneClean}`} className="text-xs text-neutral-500 hover:text-neutral-800">
                            {phone}
                          </a>
                          <a
                            href={`https://wa.me/${phoneClean}`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1 text-xs font-medium !text-green-700 hover:underline"
                          >
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WA
                          </a>
                        </div>
                      )}

                      {/* Dirección */}
                      {address && (
                        <p className="text-xs text-neutral-500 mb-1">{address}</p>
                      )}

                      {/* Fecha despacho */}
                      {order.despachado_at && (
                        <p className="text-xs text-neutral-400 mb-2">
                          Despachado: {fmtFecha(order.despachado_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}

                      {/* Líneas */}
                      <ul className="space-y-0.5 mb-3">
                        {(order.lines ?? []).map((line: any, i: number) => (
                          <li key={i} className="flex items-baseline gap-2 text-sm text-neutral-600">
                            <span className="font-semibold tabular-nums w-6 shrink-0 text-right text-neutral-800">
                              {line.quantity}×
                            </span>
                            <span>{line.product_snapshot?.name ?? "Producto"}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Acción — ancho completo en mobile */}
                      <div className="flex justify-end">
                        {order.status === "despachado"
                          ? <IniciarDistribucionButton orderId={order.id} />
                          : (
                            <ConfirmarEntregaButton
                              orderId={order.id}
                              lineas={(order.lines ?? []).map((l: any) => ({
                                productId: l.product_id ?? "",
                                name:      l.product_snapshot?.name ?? "Producto",
                                pedido:    Number(l.quantity),
                              }))}
                            />
                          )
                        }
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
