import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import { SimuladorPedido } from "@/components/admin/simulador-pedido";

export const metadata: Metadata = { title: "Simulador de Pedido — En Minutas" };
export const revalidate = 0;

const CANALES = [
  { slug: "dist",   label: "Distribuidor" },
  { slug: "gastro", label: "Gastronomía"  },
  { slug: "min",    label: "Minorista"    },
];

export default async function SimuladorPage({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string }>;
}) {
  const sp        = await searchParams;
  const canalSlug = CANALES.find((c) => c.slug === sp.canal)?.slug ?? "dist";

  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "vendedor") redirect("/admin");

  const [params, { data: canal }, { data: rawProducts }] = await Promise.all([
    getParametros(),

    adminClient
      .from("canales")
      .select("margen_std, margen_premium, markup_pvp")
      .eq("slug", canalSlug)
      .single(),

    adminClient
      .from("products")
      .select(`
        id, name, codigo, presentacion, unit_label,
        bolsas_caja, u_bolsa,
        costo, pkg_unitario, pkg_bulto,
        categoria, divisiones_display,
        linea:lineas_producto!linea_id (nombre)
      `)
      .eq("is_active", true)
      .not("codigo", "is", null)
      .order("codigo"),
  ]);

  type ProductoConPrecio = {
    id:           string;
    codigo:       number;
    nombre:       string;
    linea:        string;
    presentacion: string;
    bolsas_caja:  number;
    u_bolsa:      number;
    precio_caja:  number;
    precio_unidad: number;
  };

  const productos: ProductoConPrecio[] = [];

  for (const p of rawProducts ?? []) {
    if (!p.costo || !p.bolsas_caja || !p.u_bolsa || !p.categoria || !canal) continue;

    const precio = calcularPrecio({
      costo:              Number(p.costo),
      bolsas_caja:        Number(p.bolsas_caja),
      pkg_unitario:       Number(p.pkg_unitario ?? 0),
      pkg_bulto:          Number(p.pkg_bulto    ?? 0),
      u_bolsa:            Number(p.u_bolsa),
      categoria:          p.categoria,
      divisiones_display: p.divisiones_display ?? null,
      margen_std:         Number(canal.margen_std),
      margen_premium:     Number(canal.margen_premium),
      markup_pvp:         Number(canal.markup_pvp),
      iva_pct:            params.iva_pct,
      comision_pct:       params.comision_pct,
    });

    productos.push({
      id:           p.id,
      codigo:       Number(p.codigo),
      nombre:       p.name,
      linea:        (p.linea as any)?.nombre ?? "—",
      presentacion: p.presentacion ?? p.unit_label ?? "—",
      bolsas_caja:  Number(p.bolsas_caja),
      u_bolsa:      Number(p.u_bolsa),
      precio_caja:  precio.final_civa,
      precio_unidad: precio.precio_unidad,
    });
  }

  return (
    <SimuladorPedido
      productos={productos}
      canales={CANALES}
      canalActivo={canalSlug}
      ivaPct={params.iva_pct}
    />
  );
}
