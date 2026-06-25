import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RentabilidadClient } from "./rentabilidad-client";

export const metadata: Metadata = { title: "Rentabilidad — Admin" };
export const revalidate = 0;

const ACTIVE = ["aprobado","enviado_prod","despachado","en_distribucion","entrega_parcial","delivered","liquidado"];

const CHANNEL_LABEL: Record<string, string> = {
  b2b_mayorista: "B2B Mayorista",
  b2c_nacional:  "Tienda Online",
  distribucion:  "Distribución",
  gastronomia:   "Gastronomía",
};

export default async function RentabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const sp = await searchParams;
  const rango = sp.rango ?? "mes";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  // Calcular rango de fechas
  const ahora = new Date();
  let desde: string;
  switch (rango) {
    case "3m":  desde = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1).toISOString(); break;
    case "6m":  desde = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString(); break;
    case "año": desde = new Date(ahora.getFullYear(), 0, 1).toISOString(); break;
    default:    desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString(); break;
  }

  // Pedidos con líneas en el rango
  const { data: ordersRaw } = await db
    .from("orders")
    .select(`
      id, channel, total, created_at,
      lines:order_lines (
        product_id, quantity, line_total,
        product:products!product_id (name, costo, bolsas_caja, linea_id,
          linea:lineas_producto!linea_id (nombre))
      )
    `)
    .in("status", ACTIVE)
    .gte("created_at", desde)
    .order("created_at", { ascending: true });

  const orders = (ordersRaw ?? []) as any[];

  // Calcular por canal
  type FilaCanal = {
    canal: string; label: string;
    ingresos: number; costoMP: number; contribucion: number; pedidos: number;
  };
  const porCanal: Record<string, FilaCanal> = {};

  // Calcular por producto
  type FilaProducto = {
    nombre: string; linea: string;
    unidades: number; ingresos: number; costoMP: number; contribucion: number;
  };
  const porProducto: Record<string, FilaProducto> = {};

  for (const order of orders) {
    const canal = order.channel ?? "otro";
    if (!porCanal[canal]) {
      porCanal[canal] = { canal, label: CHANNEL_LABEL[canal] ?? canal, ingresos: 0, costoMP: 0, contribucion: 0, pedidos: 0 };
    }
    porCanal[canal].pedidos++;

    for (const line of (order.lines ?? []) as any[]) {
      const ingreso  = Number(line.line_total ?? 0);
      const costo    = Number(line.product?.costo ?? 0);
      const bolsas   = Number(line.product?.bolsas_caja ?? 1);
      const qty      = Number(line.quantity ?? 0);
      const costoMP  = costo * bolsas * qty;

      porCanal[canal].ingresos  += ingreso;
      porCanal[canal].costoMP   += costoMP;
      porCanal[canal].contribucion += ingreso - costoMP;

      const pid = line.product_id;
      if (!porProducto[pid]) {
        porProducto[pid] = {
          nombre:       line.product?.name ?? "—",
          linea:        (line.product?.linea as any)?.nombre ?? "—",
          unidades: 0, ingresos: 0, costoMP: 0, contribucion: 0,
        };
      }
      porProducto[pid].unidades    += qty;
      porProducto[pid].ingresos    += ingreso;
      porProducto[pid].costoMP     += costoMP;
      porProducto[pid].contribucion += ingreso - costoMP;
    }
  }

  const filasCanal = Object.values(porCanal)
    .sort((a, b) => b.contribucion - a.contribucion);

  const filasProducto = Object.values(porProducto)
    .sort((a, b) => b.contribucion - a.contribucion);

  // KPIs globales
  const totalIngresos     = filasCanal.reduce((s, f) => s + f.ingresos, 0);
  const totalCosto        = filasCanal.reduce((s, f) => s + f.costoMP, 0);
  const totalContribucion = totalIngresos - totalCosto;
  const margenPct = totalIngresos > 0 ? Math.round((totalContribucion / totalIngresos) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Rentabilidad</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Margen de contribución (ingresos − costo de materia prima)
        </p>
      </div>

      {/* Filtro de rango */}
      <div className="flex gap-1.5 mb-6">
        {[
          { key: "mes",  label: "Este mes" },
          { key: "3m",   label: "3 meses" },
          { key: "6m",   label: "6 meses" },
          { key: "año",  label: "Este año" },
        ].map(r => (
          <a
            key={r.key}
            href={`/admin/rentabilidad?rango=${r.key}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              rango === r.key
                ? "bg-[#16233f] text-white border-[#16233f]"
                : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {r.label}
          </a>
        ))}
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums">
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(totalIngresos)}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">{orders.length} pedidos</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Costo MP</p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums">
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(totalCosto)}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">materia prima estimada</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Contribución</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums">
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(totalContribucion)}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">ingresos − costo MP</p>
        </div>
        <div className={`rounded-2xl border p-5 ${margenPct >= 50 ? "bg-emerald-50 border-emerald-200" : margenPct >= 30 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Margen</p>
          <p className={`text-2xl font-bold tabular-nums ${margenPct >= 50 ? "text-emerald-700" : margenPct >= 30 ? "text-amber-700" : "text-red-700"}`}>
            {margenPct}%
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">sobre ingresos totales</p>
        </div>
      </div>

      <RentabilidadClient filasCanal={filasCanal} filasProducto={filasProducto} />
    </div>
  );
}
