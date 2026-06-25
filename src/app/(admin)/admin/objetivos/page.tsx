import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ObjetivosClient } from "./objetivos-client";

export const metadata: Metadata = { title: "Objetivos de ventas — Admin" };
export const revalidate = 0;

const CANALES = ["b2b_mayorista", "b2c_nacional", "pedido_ya_local"] as const;

const ACTIVE_STATUSES = [
  "paid", "preparing", "ready", "in_delivery",
  "shipped", "delivered", "liquidado", "entrega_parcial",
];

const MES_NOMBRE = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function ObjetivosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  // Últimos 6 meses + mes actual
  const hoy   = new Date();
  const periodos: { anio: number; mes: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    periodos.push({ anio: d.getFullYear(), mes: d.getMonth() + 1 });
  }

  const primerPeriodo = periodos[0];
  const fechaDesde    = `${primerPeriodo.anio}-${String(primerPeriodo.mes).padStart(2, "0")}-01`;

  // Pedidos reales en el rango
  const { data: ordenes } = await db
    .from("orders")
    .select("total_amount, channel, created_at")
    .in("status", ACTIVE_STATUSES)
    .gte("created_at", fechaDesde);

  // Objetivos guardados
  const { data: objData } = await db
    .from("objetivos_ventas")
    .select("anio, mes, canal, monto_meta")
    .gte("anio", primerPeriodo.anio);

  const objetivosMap = new Map<string, number>();
  for (const o of (objData ?? []) as any[]) {
    objetivosMap.set(`${o.anio}-${o.mes}-${o.canal}`, Number(o.monto_meta));
  }

  // Agrupar ventas reales por año/mes/canal
  const realesMap = new Map<string, number>();
  for (const o of (ordenes ?? []) as any[]) {
    const d    = new Date(o.created_at);
    const anio = d.getFullYear();
    const mes  = d.getMonth() + 1;
    const key  = `${anio}-${mes}-${o.channel}`;
    realesMap.set(key, (realesMap.get(key) ?? 0) + Number(o.total_amount ?? 0));
  }

  const meses = periodos.map(({ anio, mes }) => {
    const canales = CANALES.map(canal => {
      const real = realesMap.get(`${anio}-${mes}-${canal}`) ?? 0;
      const meta = objetivosMap.get(`${anio}-${mes}-${canal}`) ?? 0;
      const pct  = meta > 0 ? (real / meta) * 100 : 0;
      return { canal, real, meta, pct };
    });

    const totalReal = canales.reduce((s, c) => s + c.real, 0);
    // meta "global" puede estar guardada explícitamente o es la suma de canales
    const metaGlobal = objetivosMap.get(`${anio}-${mes}-global`) ?? canales.reduce((s, c) => s + c.meta, 0);
    const totalMeta  = metaGlobal;
    const totalPct   = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;

    return {
      anio,
      mes,
      label: `${MES_NOMBRE[mes]} ${anio}`,
      canales,
      totalReal,
      totalMeta,
      totalPct,
    };
  });

  // KPI resumen del mes actual
  const actual = meses[meses.length - 1];
  const anterior = meses[meses.length - 2];
  const varPct = anterior.totalReal > 0
    ? Math.round(((actual.totalReal - anterior.totalReal) / anterior.totalReal) * 100)
    : null;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Objetivos de ventas</h1>
        <p className="text-sm text-neutral-400 mt-1">Real vs meta — últimos 6 meses</p>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Este mes (real)</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums">
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(actual.totalReal)}
          </p>
        </div>
        <div className={`rounded-2xl border p-5 ${actual.totalPct >= 100 ? "bg-emerald-50 border-emerald-200" : actual.totalPct >= 70 ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">% de la meta</p>
          <p className={`text-2xl font-bold tabular-nums ${actual.totalPct >= 100 ? "text-emerald-600" : actual.totalPct >= 70 ? "text-amber-600" : actual.totalMeta > 0 ? "text-red-600" : "text-neutral-400"}`}>
            {actual.totalMeta > 0 ? `${Math.round(actual.totalPct)}%` : "Sin meta"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">vs mes anterior</p>
          <p className={`text-2xl font-bold tabular-nums ${varPct === null ? "text-neutral-400" : varPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {varPct === null ? "—" : `${varPct > 0 ? "+" : ""}${varPct}%`}
          </p>
        </div>
      </div>

      <ObjetivosClient meses={meses} />
    </div>
  );
}
