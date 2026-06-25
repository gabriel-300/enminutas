import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Devoluciones — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const ESTADO_CFG = {
  solicitada: { label: "Solicitada", bg: "#eff6ff", text: "#2563eb" },
  aprobada:   { label: "Aprobada",   bg: "#fffbeb", text: "#b45309" },
  cerrada:    { label: "Cerrada",    bg: "#ecfdf5", text: "#059669" },
  rechazada:  { label: "Rechazada",  bg: "#fef2f2", text: "#dc2626" },
};

export default async function DevolucionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  let query = db
    .from("devoluciones")
    .select("id, fecha, motivo, estado, monto_total, profiles(full_name)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (estado && estado !== "todas") query = query.eq("estado", estado);

  const { data } = await query;
  const devoluciones = (data ?? []) as any[];

  // KPIs del mes actual
  const hoy    = new Date();
  const inicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: mes } = await db
    .from("devoluciones")
    .select("estado, monto_total")
    .gte("fecha", inicio);

  const mesDatos    = (mes ?? []) as any[];
  const pendientes  = mesDatos.filter(d => d.estado === "solicitada").length;
  const montoMes    = mesDatos.filter(d => d.estado !== "rechazada").reduce((s, d) => s + Number(d.monto_total), 0);
  const aprobadas   = mesDatos.filter(d => d.estado === "aprobada" || d.estado === "cerrada").length;

  const tabs = ["todas", "solicitada", "aprobada", "cerrada", "rechazada"] as const;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900">Devoluciones</h1>
          <p className="text-sm text-neutral-400 mt-1">Gestión de devoluciones y notas de crédito</p>
        </div>
        <Link
          href="/admin/devoluciones/nueva"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors"
        >
          <Plus className="size-4" /> Nueva devolución
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Pendientes</p>
          <p className={`text-2xl font-bold ${pendientes > 0 ? "text-blue-600" : "text-neutral-900"}`}>{pendientes}</p>
          <p className="text-xs text-neutral-400 mt-0.5">este mes</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Aprobadas</p>
          <p className="text-2xl font-bold text-neutral-900">{aprobadas}</p>
          <p className="text-xs text-neutral-400 mt-0.5">este mes</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Monto acreditado</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums">{fmt(montoMes)}</p>
          <p className="text-xs text-neutral-400 mt-0.5">este mes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {tabs.map(t => (
          <Link
            key={t}
            href={t === "todas" ? "/admin/devoluciones" : `/admin/devoluciones?estado=${t}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              (estado ?? "todas") === t
                ? "bg-[#16233f] text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {t === "todas" ? "Todas" : ESTADO_CFG[t].label}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Fecha</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cliente</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Motivo</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wide">Estado</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Monto</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {devoluciones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-400">
                  No hay devoluciones registradas.
                </td>
              </tr>
            )}
            {devoluciones.map((d: any) => {
              const cfg = ESTADO_CFG[d.estado as keyof typeof ESTADO_CFG] ?? ESTADO_CFG.solicitada;
              return (
                <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3.5 text-neutral-500 tabular-nums whitespace-nowrap">
                    {new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-neutral-900">
                    {d.profiles?.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 max-w-xs truncate">{d.motivo}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: cfg.bg, color: cfg.text }}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-neutral-900 tabular-nums">
                    {fmt(Number(d.monto_total))}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/devoluciones/${d.id}`}
                      className="text-xs font-medium text-[#16233f] hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
