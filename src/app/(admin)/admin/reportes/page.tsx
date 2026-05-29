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
  sin_canal:     "Sin canal",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered"];

export default async function ReportesPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = adminClient as any;

  const [{ data: rawB2B }, { data: rawB2C }] = await Promise.all([
    db.from("orders")
      .select(`
        id, order_number, status, total, ideaia_commission_amount, created_at,
        customer:profiles!customer_id (full_name, canal)
      `)
      .eq("channel", "b2b_mayorista")
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false }),

    db.from("orders")
      .select("id, total, created_at, guest_email")
      .eq("channel", "b2c_nacional")
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false }),
  ]);

  const b2bOrders: {
    id: string; order_number: string; total: number;
    commission: number; created_at: string;
    clientName: string; clientCanal: string;
  }[] = (rawB2B ?? []).map((o: any) => ({
    id:          o.id,
    order_number: o.order_number,
    total:       Number(o.total),
    commission:  Number(o.ideaia_commission_amount ?? 0),
    created_at:  o.created_at,
    clientName:  o.customer?.full_name ?? "—",
    clientCanal: o.customer?.canal ?? "sin_canal",
  }));

  const b2cOrders: { total: number; created_at: string }[] = (rawB2C ?? []).map((o: any) => ({
    total:      Number(o.total),
    created_at: o.created_at,
  }));

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalB2B      = b2bOrders.reduce((s, o) => s + o.total, 0);
  const totalB2C      = b2cOrders.reduce((s, o) => s + o.total, 0);
  const totalGeneral  = totalB2B + totalB2C;
  const totalComision = b2bOrders.reduce((s, o) => s + o.commission, 0);

  // ── Por mes (todos los canales) ───────────────────────────────────────────
  const allOrders = [
    ...b2bOrders.map((o) => ({ total: o.total, created_at: o.created_at })),
    ...b2cOrders,
  ];
  const byMonthMap: Record<string, number> = {};
  for (const o of allOrders) {
    const d = new Date(o.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonthMap[k] = (byMonthMap[k] ?? 0) + o.total;
  }
  const byMonth = Object.entries(byMonthMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6);

  const mesActual    = new Date();
  const keyMesActual = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, "0")}`;
  const totalMes     = byMonthMap[keyMesActual] ?? 0;

  // ── Por canal B2B ──────────────────────────────────────────────────────────
  const byCanalMap: Record<string, { count: number; total: number }> = {};
  for (const o of b2bOrders) {
    const k = o.clientCanal;
    if (!byCanalMap[k]) byCanalMap[k] = { count: 0, total: 0 };
    byCanalMap[k].count++;
    byCanalMap[k].total += o.total;
  }

  // ── Top clientes B2B ──────────────────────────────────────────────────────
  const clientMap: Record<string, { name: string; count: number; total: number }> = {};
  for (const o of b2bOrders) {
    if (!clientMap[o.clientName]) clientMap[o.clientName] = { name: o.clientName, count: 0, total: 0 };
    clientMap[o.clientName].count++;
    clientMap[o.clientName].total += o.total;
  }
  const topClientes = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Reportes</h1>
          <p className="text-sm text-neutral-500 mt-1">Ventas confirmadas — todos los canales</p>
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
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Total general</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalGeneral)}</p>
          <p className="text-xs text-neutral-400 mt-1">{b2bOrders.length + b2cOrders.length} pedidos</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">B2B Mayorista</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalB2B)}</p>
          <p className="text-xs text-neutral-400 mt-1">{b2bOrders.length} pedidos</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Tienda online</p>
          <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalB2C)}</p>
          <p className="text-xs text-neutral-400 mt-1">{b2cOrders.length} pedidos</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 mb-1">Este mes</p>
          <p className="text-2xl font-semibold font-display text-tierra-700">{fmt(totalMes)}</p>
          <p className="text-xs text-neutral-400 mt-1">
            {mesActual.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Por canal B2B */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-medium text-neutral-700">B2B por tipo de cliente</p>
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
              {Object.entries(byCanalMap).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-neutral-400 text-xs">Sin datos</td>
                </tr>
              )}
              {Object.entries(byCanalMap)
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

      {/* Top clientes B2B */}
      {topClientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-medium text-neutral-700">Top clientes B2B</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Cliente</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Pedidos</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total comprado</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Ticket promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {topClientes.map((c, i) => (
                <tr key={c.name} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 text-neutral-800 font-medium">
                    <span className="text-neutral-300 mr-2 tabular-nums text-xs">#{i + 1}</span>
                    {c.name}
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-500">{c.count}</td>
                  <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(c.total)}</td>
                  <td className="px-5 py-3 text-right text-neutral-500 tabular-nums">{fmt(Math.round(c.total / c.count))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comisión Ideaia */}
      {totalComision > 0 && (
        <div className="mt-4 bg-neutral-50 rounded-2xl border border-neutral-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Comisión Ideaia acumulada</p>
            <p className="text-xs text-neutral-400 mt-0.5">15% sobre ventas B2B</p>
          </div>
          <p className="text-2xl font-semibold font-display text-neutral-900 tabular-nums">{fmt(totalComision)}</p>
        </div>
      )}
    </div>
  );
}
