import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevoPedidoClient } from "@/components/admin/nuevo-pedido-client";

export const metadata: Metadata = { title: "Nuevo pedido — Admin En Minutas" };
export const revalidate = 0;

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; repetir?: string }>;
}) {
  const sp = await searchParams;
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const esAdmin   = user.app_metadata?.role === "admin";
  const esVendedor = user.app_metadata?.role === "vendedor";

  const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const b2bIds = (allUsers ?? [])
    .filter((u: any) => u.app_metadata?.role === "customer_b2b")
    .map((u: any) => u.id as string);

  const [{ data: rawClientes }, { data: rawProducts }, { data: rawTiers }, { data: rawDirecciones }] = await Promise.all([
    b2bIds.length > 0
      ? (() => {
          let q = adminClient
            .from("profiles")
            .select(`
              id, full_name,
              canal:canales!canal_id (nombre, slug, margen_std, margen_premium, markup_pvp)
            `)
            .in("id", b2bIds)
            .eq("b2b_status", "activo")
            .order("full_name");
          if (esVendedor) q = q.eq("vendedor_id", user.id);
          return q;
        })()
      : Promise.resolve({ data: [] }),

    adminClient
      .from("products")
      .select(`
        id, sku, name, unit_label, min_quantity_b2b,
        codigo, presentacion, u_bolsa, bolsas_caja, kg_caja,
        costo, pkg_unitario, pkg_bulto,
        categoria, divisiones_display,
        linea:lineas_producto!linea_id (nombre)
      `)
      .eq("is_active", true)
      .not("codigo", "is", null)
      .order("codigo"),

    adminClient
      .from("volume_discounts")
      .select("min_cajas, descuento_pct, label")
      .eq("activo", true)
      .order("min_cajas"),

    b2bIds.length > 0
      ? adminClient
          .from("direcciones_entrega")
          .select("id, profile_id, alias, calle, numero, piso, ciudad, es_principal, zona_id, zona:delivery_zones!zona_id (id, name, km, precio_km)")
          .in("profile_id", b2bIds)
          .eq("activo", true)
          .order("es_principal", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const clientes = (rawClientes ?? []).map((c: any) => ({
    id:              c.id,
    full_name:       c.full_name,
    canal_nombre:    c.canal?.nombre        ?? "Sin canal",
    canal_slug:      c.canal?.slug          ?? "",
    margen_std:      Number(c.canal?.margen_std     ?? 0),
    margen_premium:  Number(c.canal?.margen_premium ?? 0),
    markup_pvp:      Number(c.canal?.markup_pvp     ?? 0.80),
  }));

  const direccionesMap: Record<string, any[]> = {};
  for (const d of (rawDirecciones ?? []) as any[]) {
    if (!direccionesMap[d.profile_id]) direccionesMap[d.profile_id] = [];
    direccionesMap[d.profile_id].push({
      id:          d.id,
      alias:       d.alias,
      calle:       d.calle,
      numero:      d.numero ?? null,
      piso:        d.piso   ?? null,
      ciudad:      d.ciudad,
      zona_id:     d.zona?.id    ?? null,
      zona_name:   d.zona?.name  ?? "Sin zona",
      km:          Number(d.zona?.km        ?? 0),
      precio_km:   Number(d.zona?.precio_km ?? 0),
      es_principal: d.es_principal,
    });
  }

  const productosRaw = (rawProducts ?? []).map((p: any) => ({
    id:                 p.id,
    sku:                p.sku,
    name:               p.name,
    unit_label:         p.unit_label,
    min_quantity_b2b:   p.min_quantity_b2b ?? 1,
    codigo:             p.codigo,
    presentacion:       p.presentacion ?? p.unit_label,
    u_bolsa:            Number(p.u_bolsa ?? 1),
    bolsas_caja:        Number(p.bolsas_caja ?? 1),
    kg_caja:            Number(p.kg_caja ?? 0),
    costo:              Number(p.costo ?? 0),
    pkg_unitario:       Number(p.pkg_unitario ?? 0),
    pkg_bulto:          Number(p.pkg_bulto ?? 0),
    categoria:          p.categoria ?? "Estándar",
    divisiones_display: p.divisiones_display ?? null,
    linea:              (p.linea as any)?.nombre ?? "Sin línea",
  }));

  let itemsInit: Record<string, number> = {};
  if (sp.repetir) {
    const { data: lines } = await adminClient
      .from("order_lines")
      .select("product_id, quantity")
      .eq("order_id", sp.repetir);
    for (const line of (lines ?? []) as any[]) {
      if (line.product_id) itemsInit[line.product_id] = Number(line.quantity);
    }
  }

  const fromPreventista = !!(sp.cliente || sp.repetir);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 md:mb-6 flex items-center justify-between">
        <div>
          <Link
            href={fromPreventista ? "/admin/preventista" : "/admin/pedidos"}
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-2 inline-block"
          >
            ← {fromPreventista ? "Volver al preventista" : "Volver a pedidos"}
          </Link>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">
            {sp.repetir ? "Repetir pedido" : "Nuevo pedido"}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {sp.repetir
              ? "Pedido pre-cargado con los productos del último pedido — revisá cantidades antes de confirmar."
              : "Pedido cargado manualmente — se registra como creado por el admin."}
          </p>
        </div>
      </div>

      <NuevoPedidoClient
        clientes={clientes}
        direccionesMap={direccionesMap}
        productosRaw={productosRaw}
        clienteInit={sp.cliente ?? null}
        itemsInit={itemsInit}
        esAdmin={esAdmin}
        tiers={(rawTiers ?? []).map((t: any) => ({
          minCajas:     Number(t.min_cajas),
          descuentoPct: Number(t.descuento_pct),
          label:        t.label as string,
        }))}
      />
    </div>
  );
}
