import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Reportes — Admin En Minutas" };
export const revalidate = 0;

const CANAL_LABEL: Record<string, string> = {
  b2b_mayorista: "B2B Mayorista",
  b2c_nacional:  "Tienda online",
  dist:          "Distribuidor",
  gastro:        "Gastronomía",
  min:           "Minorista",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type OrderRow = {
  id:                    string;
  order_number:          string;
  status:                string;
  total:                 number;
  ideaia_commission_amount: number;
  created_at:            string;
  payment_confirmed_at:  string | null;
  customer_canal:        string | null;
};

function groupByCanal(orders: OrderRow[]) {
  const map: Record<string, { count: number; total: number; commission: number }> = {};
  for (const o of orders) {
    const k = o.customer_canal ?? "sin_canal";
    if (!map[k]) map[k] = { count: 0, total: 0, commission: 0 };
    map[k].count++;
    map[k].total      += Number(o.total);
    map[k].commission += Number(o.ideaia_commission_amount);
  }
  return map;
}

function groupByMonth(orders: OrderRow[]) {
  const map: Record<string, number> = {};
  for (const o of orders) {
    const d = new Date(o.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map[k] = (map[k] ?? 0) + Number(o.total);
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
}

export default async function ReportesPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pedidos B2B activos (aprobados o más avanzados — excluye pending y cancelados)
  const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered"];

  const { data: rawOrders } = await (adminClient as any)
    .from("orders")
    .select(`
      id, order_number, status, total, ideaia_commission_amount,
      created_at, payment_confirmed_at,
      customer:profiles!customer_id (canal)
    `)
    .eq("channel", "b2b_mayorista")
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false });

  const orders: OrderRow[] = (rawOrders ?? []).map((o: any) => ({
    id:                       o.id,
    order_number:             o.order_number,
    status:                   o.status,
    total:                    Number(o.total),
    ideaia_commission_amount: Number(o.ideaia_commission_amount ?? 0),
    created_at:               o.created_at,
    payment_confirmed_at:     o.payment_confirmed_at ?? null,
    customer_canal:           o.customer?.canal ?? null,
  }));

  const confirmed = orders;

  const totalGeneral    = confirmed.reduce((s, o) => s + o.total, 0);
  const totalComision   = confirmed.reduce((s, o) => s + o.ideaia_commission_amount, 0);
  const byCanal         = groupByCanal(confirmed);
  const byMonth         = groupByMonth(confirmed);

  const mesActual = new Date();
  const keyMesActual = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, "0")}`;
  const totalMes = byMonth.find(([k]) => k === keyMesActual)?.[1] ?? 0;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Reportes</h1>
          <p className="text-sm text-neutral-500 mt-1">Ventas B2B aprobadas</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-neutral-400 mr-1">Lista de precios:</p>
          {["dist", "gastro", "min"].map((c) => (
            <a
              key={c}
              href={`/admin/reportes/precios?canal=${c}`}
              download
              className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              {c === "dist" ? "Distribuidor" : c === "gastro" ? "Gastronomía" : "Minorista"} CSV
            </a>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Total facturado</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalGeneral)}</p>
          <p className="text-xs text-neutral-400 mt-1">{confirmed.length} pedidos aprobados</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Este mes</p>
          <p className="text-2xl font-semibold font-display text-tierra-700">{fmt(totalMes)}</p>
          <p className="text-xs text-neutral-400 mt-1">
            {mesActual.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Comisión Ideaia acumulada</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalComision)}</p>
          <p className="text-xs text-neutral-400 mt-1">15% sobre lista s/IVA</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Por canal */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-medium text-neutral-700">Ventas por canal</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Canal</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Pedidos</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {Object.entries(byCanal).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-neutral-400 text-xs">Sin datos</td>
                </tr>
              )}
              {Object.entries(byCanal)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([canal, data]) => (
                  <tr key={canal}>
                    <td className="px-5 py-3 font-medium text-neutral-800">
                      {CANAL_LABEL[canal] ?? canal}
                    </td>
                    <td className="px-5 py-3 text-right text-neutral-500">{data.count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">
                      {fmt(data.total)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Por mes */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-medium text-neutral-700">Últimos 6 meses</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Período</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {byMonth.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-neutral-400 text-xs">Sin datos</td>
                </tr>
              )}
              {byMonth.map(([key, total]) => {
                const [year, month] = key.split("-");
                const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("es-AR", {
                  month: "long", year: "numeric",
                });
                return (
                  <tr key={key}>
                    <td className="px-5 py-3 text-neutral-700 capitalize">{label}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">
                      {fmt(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
