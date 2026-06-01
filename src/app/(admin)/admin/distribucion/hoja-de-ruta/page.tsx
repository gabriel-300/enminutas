import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";

export const revalidate = 0;

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function HojaDeRutaPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await (adminClient as any)
    .from("orders")
    .select(`
      id, order_number, despachado_at,
      shipping_snapshot,
      customer:profiles!customer_id (full_name, phone, zona:delivery_zones!zona_id (name)),
      guest_phone,
      lines:order_lines (quantity, product_snapshot)
    `)
    .eq("channel", "b2b_mayorista")
    .eq("status", "despachado")
    .order("despachado_at", { ascending: true });

  const lista = (orders ?? []) as any[];

  // Agrupar por zona
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

  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  let stopNumber = 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar — solo pantalla */}
      <div className="print:hidden flex items-center justify-between px-8 py-4 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-4">
          <a href="/admin/distribucion" className="text-sm text-neutral-500 hover:text-neutral-700">
            ← Volver
          </a>
          <span className="text-sm font-semibold text-neutral-900">Hoja de ruta</span>
        </div>
        <PrintButton />
      </div>

      {/* Documento */}
      <div className="max-w-3xl mx-auto px-8 py-8 print:px-6 print:py-4 print:max-w-none">

        {/* Encabezado */}
        <div className="flex items-start justify-between mb-8 print:mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 print:text-xl">Hoja de Ruta</h1>
            <p className="text-sm text-neutral-500 mt-1 capitalize">{fecha}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-neutral-900">En Minutas</p>
            <p className="text-sm text-neutral-500">
              {lista.length} parada{lista.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-sm">
            No hay pedidos despachados pendientes de entrega.
          </div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {zoneNames.map((zoneName) => (
              <div key={zoneName}>
                {/* Encabezado de zona */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-neutral-300" />
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 px-2">
                    {zoneName}
                  </span>
                  <div className="h-px flex-1 bg-neutral-300" />
                </div>

                <div className="space-y-4 print:space-y-3">
                  {byZone[zoneName].map((order) => {
                    stopNumber++;
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
                        className="border border-neutral-300 rounded-xl p-5 print:rounded-lg print:p-4 print:break-inside-avoid"
                      >
                        {/* Cabecera de parada */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center size-8 rounded-full bg-neutral-900 text-white text-sm font-bold shrink-0 print:size-7 print:text-xs">
                              {stopNumber}
                            </span>
                            <div>
                              <p className="font-bold text-neutral-900 text-base print:text-sm">
                                {order.customer?.full_name ?? "—"}
                              </p>
                              <p className="text-xs font-mono text-neutral-400">{order.order_number}</p>
                            </div>
                          </div>
                        </div>

                        {/* Dirección y teléfono */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 pl-11 print:pl-9">
                          {address && (
                            <p className="text-sm text-neutral-700">
                              📍 {address}
                            </p>
                          )}
                          {phone && (
                            <p className="text-sm text-neutral-700">
                              📞 {phone}
                            </p>
                          )}
                          {dias !== null && dias > 0 && (
                            <p className="text-xs text-neutral-400">
                              Despachado hace {dias}d
                            </p>
                          )}
                        </div>

                        {/* Productos */}
                        <div className="pl-11 print:pl-9 border-t border-neutral-100 pt-3">
                          <ul className="space-y-1">
                            {(order.lines ?? []).map((line: any, i: number) => (
                              <li key={i} className="flex items-baseline gap-2 text-sm">
                                <span className="font-bold tabular-nums w-6 text-right text-neutral-800 shrink-0">
                                  {line.quantity}×
                                </span>
                                <span className="text-neutral-700">
                                  {line.product_snapshot?.name ?? "Producto"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Línea de firma */}
                        <div className="pl-11 print:pl-9 mt-4 pt-3 border-t border-dashed border-neutral-200 flex items-end justify-between">
                          <p className="text-xs text-neutral-400">Firma / aclaración</p>
                          <div className="w-48 border-b border-neutral-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Resumen final */}
            <div className="border-t-2 border-neutral-900 pt-4 mt-8 print:mt-4">
              <p className="text-sm font-semibold text-neutral-700">
                Total paradas: {lista.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
