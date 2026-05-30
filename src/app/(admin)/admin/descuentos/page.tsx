import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DescuentosClient } from "@/components/admin/descuentos-client";

export const metadata: Metadata = { title: "Descuentos por volumen — Admin En Minutas" };
export const revalidate = 0;

export default async function DescuentosPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tiers } = await adminClient
    .from("volume_discounts")
    .select("id, min_cajas, descuento_pct, label, activo")
    .order("min_cajas");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Descuentos por volumen</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Se aplican automáticamente en pedidos B2B según la cantidad total de cajas.
        </p>
      </div>

      <div className="mb-6 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-500 space-y-1">
        <p><strong>¿Cómo funciona?</strong> Al crear un pedido, si la cantidad total de cajas alcanza un escalón, el descuento se aplica automáticamente sobre el subtotal.</p>
        <p>Solo se aplica el descuento del escalón más alto alcanzado. Los escalones inactivos se ignoran.</p>
      </div>

      <DescuentosClient tiers={(tiers ?? []) as any[]} />
    </div>
  );
}
