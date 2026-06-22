import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calcularPrecio, formatPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import Link from "next/link";
import { ListaPreciosControls } from "@/components/admin/lista-precios-controls";

export const metadata: Metadata = { title: "Lista de Precios — En Minutas" };
export const revalidate = 0;

const CANALES = [
  { slug: "dist",   label: "Distribuidor" },
  { slug: "gastro", label: "Gastronomía"  },
  { slug: "min",    label: "Minorista"    },
];

export default async function ListaPreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string }>;
}) {
  const sp        = await searchParams;
  const canalSlug = CANALES.find((c) => c.slug === sp.canal)?.slug ?? "dist";
  const canalLabel = CANALES.find((c) => c.slug === canalSlug)!.label;

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
        id, name, sku, codigo, presentacion, unit_label,
        bolsas_caja, u_bolsa, kg_caja,
        costo, pkg_unitario, pkg_bulto,
        categoria, divisiones_display,
        linea:lineas_producto!linea_id (nombre)
      `)
      .eq("is_active", true)
      .not("codigo", "is", null)
      .order("codigo"),
  ]);

  type Fila = {
    codigo:          number;
    linea:           string;
    nombre:          string;
    presentacion:    string;
    bolsas_caja:     number;
    u_bolsa:         number;
    precio_siva:     number;
    precio_caja:     number;
    precio_unidad:   number;
    pvp_unidad:      number;
  };

  const filas: Fila[] = [];

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

    filas.push({
      codigo:          Number(p.codigo),
      linea:           (p.linea as any)?.nombre ?? "—",
      nombre:          p.name,
      presentacion:    p.presentacion ?? p.unit_label ?? "—",
      bolsas_caja:     Number(p.bolsas_caja),
      u_bolsa:         Number(p.u_bolsa),
      precio_siva:     precio.lista_siva,
      precio_caja:     precio.final_civa,
      precio_unidad:   precio.precio_unidad,
      pvp_unidad:      precio.pvp_unidad,
    });
  }

  const fecha = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl">

      {/* Header — oculto al imprimir */}
      <div className="print:hidden mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/preventista" className="text-sm text-neutral-400 hover:text-neutral-600">
              ← Preventista
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">
            Lista de Precios
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Canal <span className="font-medium text-neutral-700">{canalLabel}</span> — {fecha}
          </p>
        </div>

        <ListaPreciosControls canales={CANALES} canalActivo={canalSlug} />
      </div>

      {/* Encabezado de impresión — solo visible al imprimir */}
      <div className="hidden print:block mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold">En Minutas</p>
            <p className="text-base font-semibold mt-0.5">Lista de Precios — {canalLabel}</p>
          </div>
          <div className="text-right text-sm text-neutral-500">
            <p>{fecha}</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto print:rounded-none print:border-0 print:overflow-visible">
        <table className="w-full min-w-[700px] text-sm print:text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-left bg-neutral-50 print:bg-transparent">
              <th className="px-3 py-3 font-semibold text-neutral-600 w-14 text-right">Cód</th>
              <th className="px-3 py-3 font-semibold text-neutral-600">Línea</th>
              <th className="px-3 py-3 font-semibold text-neutral-600">Producto</th>
              <th className="px-3 py-3 font-semibold text-neutral-600">Presentación</th>
              <th className="px-3 py-3 font-semibold text-neutral-600 text-center w-16">Bolsas</th>
              <th className="px-3 py-3 font-semibold text-neutral-600 text-center w-14">U/bolsa</th>
              <th className="px-3 py-3 font-semibold text-neutral-500 text-right">Precio s/IVA</th>
              <th className="px-3 py-3 font-semibold text-neutral-700 text-right">Precio caja</th>
              <th className="px-3 py-3 font-semibold text-neutral-700 text-right">Precio/u</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-neutral-400 text-sm">
                  Sin productos con precios configurados para este canal.
                </td>
              </tr>
            ) : filas.map((f) => (
              <tr key={f.codigo} className="hover:bg-neutral-50 print:hover:bg-transparent">
                <td className="px-3 py-2 text-right text-neutral-400 font-mono text-xs">{f.codigo}</td>
                <td className="px-3 py-2 text-neutral-500 text-xs">{f.linea}</td>
                <td className="px-3 py-2 font-medium text-neutral-900">{f.nombre}</td>
                <td className="px-3 py-2 text-neutral-600 text-xs">{f.presentacion}</td>
                <td className="px-3 py-2 text-center text-neutral-500">{f.bolsas_caja}</td>
                <td className="px-3 py-2 text-center text-neutral-500">{f.u_bolsa}</td>
                <td className="px-3 py-2 text-right text-neutral-400 tabular-nums text-xs">
                  {formatPrecio(f.precio_siva)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-neutral-900 tabular-nums">
                  {formatPrecio(f.precio_caja)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-neutral-700 tabular-nums">
                  {formatPrecio(f.precio_unidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer — siempre visible */}
      <p className="mt-4 text-xs text-neutral-400 italic print:text-neutral-600 print:mt-3">
        Lista de precios sujeta a modificaciones sin previo aviso. Precios en pesos argentinos c/IVA incluido.
      </p>

    </div>
  );
}
