import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevoPedidoClient } from "@/components/admin/nuevo-pedido-client";

export const metadata: Metadata = { title: "Nuevo pedido — Admin En Minutas" };
export const revalidate = 0;

export default async function NuevoPedidoPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rawClientes }, { data: rawProducts }] = await Promise.all([
    adminClient
      .from("profiles")
      .select(`
        id, full_name, canal,
        zona:delivery_zones!zona_id (id, name, flete_kg)
      `)
      .eq("role", "customer_b2b")
      .eq("b2b_status", "activo")
      .order("full_name"),

    adminClient
      .from("products")
      .select(`
        id, sku, name, unit_label, bolsas_caja, kg_caja,
        costo, pkg_unitario, pkg_bulto, margen_dist, margen_gastro, margen_min, mult_bolsas,
        category:categories!category_id (name)
      `)
      .eq("is_active", true)
      .order("name"),
  ]);

  const clientes = (rawClientes ?? []).map((c: any) => ({
    id:        c.id,
    full_name: c.full_name,
    canal:     c.canal ?? "min",
    zona_id:   c.zona?.id   ?? null,
    zona_name: c.zona?.name ?? "Sin zona",
    flete_kg:  Number(c.zona?.flete_kg ?? 0),
  }));

  const productosRaw = (rawProducts ?? []).map((p: any) => ({
    id:            p.id,
    sku:           p.sku,
    name:          p.name,
    unit_label:    p.unit_label,
    bolsas_caja:   p.bolsas_caja,
    kg_caja:       p.kg_caja,
    costo:         p.costo,
    pkg_unitario:  p.pkg_unitario,
    pkg_bulto:     p.pkg_bulto,
    margen_dist:   p.margen_dist,
    margen_gastro: p.margen_gastro,
    margen_min:    p.margen_min,
    mult_bolsas:   p.mult_bolsas,
    categoria:     (p.category as any)?.name ?? "Sin categoría",
  }));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/admin/pedidos"
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-2 inline-block"
          >
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Nuevo pedido</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Pedido cargado manualmente — se registra como creado por el admin.
          </p>
        </div>
      </div>

      <NuevoPedidoClient clientes={clientes} productosRaw={productosRaw} />
    </div>
  );
}
