import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PipelineClient } from "./pipeline-client";
import { ESTADOS } from "./constants";

export const metadata: Metadata = { title: "Pipeline — Admin" };
export const revalidate = 0;

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = user.app_metadata?.role;
  if (!["admin", "vendedor"].includes(role)) redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: prospectos } = await db
    .from("pipeline_prospectos")
    .select("*, profiles!pipeline_prospectos_preventista_id_fkey(full_name)")
    .order("updated_at", { ascending: false });

  // Preventistas para el formulario
  const { data: preventistas } = await db
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "vendedor"])
    .order("full_name");

  const lista = (prospectos ?? []) as any[];

  // KPIs
  const activos       = lista.filter(p => !["ganado", "perdido"].includes(p.estado));
  const ganados       = lista.filter(p => p.estado === "ganado");
  const totalPipeline = activos.reduce((s: number, p: any) => s + Number(p.valor_estimado ?? 0), 0);
  const tasaConversion = lista.length > 0
    ? Math.round((ganados.length / lista.length) * 100)
    : 0;
  const proximos = activos
    .filter((p: any) => p.fecha_proximo_contacto)
    .filter((p: any) => {
      const d = new Date(p.fecha_proximo_contacto);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - hoy.getTime()) / 86400000);
      return diff >= 0 && diff <= 7;
    }).length;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Pipeline B2B</h1>
        <p className="text-sm text-neutral-400 mt-1">Prospección y seguimiento de nuevos clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Prospectos activos</p>
          <p className="text-2xl font-bold text-neutral-900">{activos.length}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{lista.length} totales</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Valor estimado</p>
          <p className="text-2xl font-bold text-neutral-900">
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(totalPipeline)}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">mensual en pipeline</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Tasa conversión</p>
          <p className="text-2xl font-bold text-emerald-600">{tasaConversion}%</p>
          <p className="text-xs text-neutral-400 mt-0.5">{ganados.length} ganados</p>
        </div>
        <div className={`rounded-2xl p-5 border ${proximos > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Contactar esta semana</p>
          <p className={`text-2xl font-bold ${proximos > 0 ? "text-amber-700" : "text-neutral-900"}`}>{proximos}</p>
          <p className="text-xs text-neutral-400 mt-0.5">próximos 7 días</p>
        </div>
      </div>

      <PipelineClient
        prospectos={lista}
        preventistas={(preventistas ?? []) as any[]}
        userRole={role}
        userId={user.id}
      />
    </div>
  );
}
