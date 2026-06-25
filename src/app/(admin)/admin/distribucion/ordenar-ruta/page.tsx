import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdenarRutaClient } from "./ordenar-ruta-client";

export const metadata: Metadata = { title: "Ordenar ruta — Distribución" };
export const revalidate = 0;

export default async function OrdenarRutaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = user.app_metadata?.role;
  if (!["admin", "distribucion"].includes(role)) redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: orders } = await db
    .from("orders")
    .select(`
      id, order_number, orden_ruta,
      shipping_snapshot,
      customer:profiles!customer_id (full_name, phone, zona:delivery_zones!zona_id (name)),
      guest_phone,
      lines:order_lines (quantity, product_snapshot)
    `)
    .eq("channel", "b2b_mayorista")
    .in("status", ["despachado", "en_distribucion"])
    .order("orden_ruta", { ascending: true, nullsFirst: false });

  const lista = ((orders ?? []) as any[]).map((o: any, i: number) => ({
    id:            o.id,
    order_number:  o.order_number,
    orden_ruta:    o.orden_ruta ?? null,
    cliente:       o.customer?.full_name ?? "—",
    telefono:      o.customer?.phone ?? o.guest_phone ?? null,
    zona:          o.customer?.zona?.name ?? null,
    address:       o.shipping_snapshot
      ? [o.shipping_snapshot.street, o.shipping_snapshot.number, o.shipping_snapshot.city]
          .filter(Boolean).join(", ")
      : null,
    lineas: (o.lines ?? []).map((l: any) => ({
      qty:  l.quantity,
      name: l.product_snapshot?.name ?? "Producto",
    })),
  }));

  // Separar ordenados y sin orden
  const ordenados  = lista.filter(o => o.orden_ruta !== null).sort((a, b) => a.orden_ruta! - b.orden_ruta!);
  const sinOrden   = lista.filter(o => o.orden_ruta === null);
  // Merge: ordenados primero, luego sin orden al final
  const merged = [...ordenados, ...sinOrden];

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <a href="/admin/distribucion" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-xl font-semibold font-display text-neutral-900">Ordenar ruta</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {lista.length} parada{lista.length !== 1 ? "s" : ""} · arrastrá para reordenar
          </p>
        </div>
      </div>

      <OrdenarRutaClient paradas={merged} />
    </div>
  );
}
