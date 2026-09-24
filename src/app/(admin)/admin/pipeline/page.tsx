import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PipelineClient } from "./pipeline-client";
import { ESTADOS } from "./constants";
import { KpiCard, PageHeader } from "@/components/ui";

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
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        className="mb-6"
        title="Pipeline B2B"
        subtitle="Prospección y seguimiento de nuevos clientes"
      />

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-6">
        <KpiCard label="Prospectos activos" value={activos.length} footer={`${lista.length} totales`} />
        <KpiCard
          label="Valor estimado"
          value={new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(totalPipeline)}
          footer="mensual en pipeline"
        />
        <KpiCard label="Tasa conversión" value={`${tasaConversion}%`} footer={`${ganados.length} ganados`} />
        <KpiCard
          label="Contactar esta semana"
          value={proximos}
          footer="próximos 7 días"
          tone={proximos > 0 ? "warning" : "default"}
        />
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
