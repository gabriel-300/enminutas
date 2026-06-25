import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PcClient } from "./pc-client";

export const metadata: Metadata = { title: "Precios por cliente — Admin" };
export const revalidate = 0;

export default async function PreciosClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: cuenta } = await db
    .from("b2b_accounts")
    .select("business_name, cuit")
    .eq("profile_id", id)
    .single();

  if (!cuenta) notFound();

  // Overrides actuales con datos del producto
  const { data: overridesData } = await db
    .from("precios_cliente")
    .select("*, products(id, name, price_b2b)")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  const overrides = ((overridesData ?? []) as any[]).map((o: any) => ({
    id:               o.id,
    producto_id:      o.producto_id,
    producto_nombre:  o.products?.name ?? "—",
    precio_b2b_std:   Number(o.products?.price_b2b ?? 0),
    tipo:             o.tipo,
    precio_fijo:      o.precio_fijo !== null ? Number(o.precio_fijo) : null,
    descuento_pct:    o.descuento_pct !== null ? Number(o.descuento_pct) : null,
    vigente_desde:    o.vigente_desde,
    vigente_hasta:    o.vigente_hasta,
    notas:            o.notas,
  }));

  // Todos los productos activos para el formulario
  const { data: productos } = await db
    .from("products")
    .select("id, name, price_b2b")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/precios-cliente" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold font-display text-neutral-900">{cuenta.business_name}</h1>
          <p className="text-sm text-neutral-400 mt-0.5">CUIT: {cuenta.cuit} · {overrides.length} precio{overrides.length !== 1 ? "s" : ""} especial{overrides.length !== 1 ? "es" : ""}</p>
        </div>
      </div>

      <PcClient
        clienteId={id}
        overrides={overrides}
        productos={(productos ?? []) as any[]}
      />
    </div>
  );
}
