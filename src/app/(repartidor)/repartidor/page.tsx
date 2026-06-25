import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RepartidorClient } from "./repartidor-client";

export const revalidate = 0;

export default async function RepartidorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "distribucion"].includes(role ?? "")) redirect("/login");

  const db = createAdminClient() as any;

  const { data: perfil } = await db
    .from("profiles")
    .select("full_name, zona_id, zona:delivery_zones!zona_id(name)")
    .eq("id", user.id)
    .maybeSingle();

  const zonaId     = perfil?.zona_id ?? null;
  const esDistrib  = role === "distribucion";

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const buildQ = (statuses: string[]) => {
    let q = db
      .from("orders")
      .select(`
        id, order_number, status, despachado_at, orden_ruta,
        shipping_snapshot,
        customer:profiles!customer_id (full_name, phone, zona:delivery_zones!zona_id (name)),
        guest_phone,
        lines:order_lines (product_id, quantity, product_snapshot)
      `)
      .eq("channel", "b2b_mayorista")
      .in("status", statuses);
    if (esDistrib) {
      q = q.eq("delivery_zone_id", zonaId ?? "00000000-0000-0000-0000-000000000000");
    }
    return q;
  };

  const [{ data: pendientes }, { data: entregados }] = await Promise.all([
    buildQ(["despachado", "en_distribucion"]).order("orden_ruta", { ascending: true, nullsFirst: false }),
    (() => {
      let q = db
        .from("orders")
        .select(`id, order_number, entregado_at, customer:profiles!customer_id (full_name)`)
        .eq("channel", "b2b_mayorista")
        .eq("status", "delivered")
        .gte("entregado_at", hoyInicio.toISOString())
        .order("entregado_at", { ascending: false });
      if (esDistrib) q = q.eq("delivery_zone_id", zonaId ?? "00000000-0000-0000-0000-000000000000");
      return q;
    })(),
  ]);

  // Sort: con orden_ruta primero (asc), sin orden por despachado_at
  const lista = ((pendientes ?? []) as any[]).sort((a, b) => {
    if (a.orden_ruta !== null && b.orden_ruta !== null) return a.orden_ruta - b.orden_ruta;
    if (a.orden_ruta !== null) return -1;
    if (b.orden_ruta !== null) return 1;
    return new Date(a.despachado_at).getTime() - new Date(b.despachado_at).getTime();
  });

  return (
    <RepartidorClient
      pedidos={lista}
      entregadosHoy={(entregados ?? []) as any[]}
      userName={perfil?.full_name ?? user.email ?? "Repartidor"}
      zonaNombre={(perfil?.zona as any)?.name ?? null}
    />
  );
}
