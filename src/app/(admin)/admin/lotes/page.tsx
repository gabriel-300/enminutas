import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LotesClient } from "./lotes-client";

export const metadata: Metadata = { title: "Lotes — Admin" };
export const revalidate = 0;

type EstadoLote = "vencido" | "critico" | "proximo" | "vigente";

function calcularEstado(fechaVencimiento: string): { estado: EstadoLote; dias: number } {
  const hoy  = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + "T00:00:00");
  const dias = Math.floor((venc.getTime() - hoy.getTime()) / 86400000);

  if (dias < 0)    return { estado: "vencido",  dias };
  if (dias <= 7)   return { estado: "critico",  dias };
  if (dias <= 30)  return { estado: "proximo",  dias };
  return             { estado: "vigente",  dias };
}

export default async function LotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: lotesData } = await db
    .from("lotes")
    .select("*, products(id, name)")
    .eq("activo", true)
    .order("fecha_vencimiento", { ascending: true });

  const { data: productosData } = await db
    .from("products")
    .select("id, name, unit_label")
    .eq("is_active", true)
    .order("name");

  const lotes = ((lotesData ?? []) as any[]).map((l: any) => {
    const { estado, dias } = calcularEstado(l.fecha_vencimiento);
    return {
      id:               l.id,
      producto_id:      l.producto_id,
      producto_nombre:  l.products?.name ?? "—",
      numero_lote:      l.numero_lote,
      fecha_ingreso:    l.fecha_ingreso,
      fecha_vencimiento: l.fecha_vencimiento,
      cantidad_inicial: Number(l.cantidad_inicial),
      cantidad_actual:  Number(l.cantidad_actual),
      unidad:           l.unidad,
      proveedor:        l.proveedor,
      estado,
      dias_restantes:   dias,
    };
  });

  const productos = (productosData ?? []) as any[];

  const vencidos = lotes.filter(l => l.estado === "vencido").length;
  const criticos = lotes.filter(l => l.estado === "critico").length;
  const proximos = lotes.filter(l => l.estado === "proximo").length;
  const vigentes = lotes.filter(l => l.estado === "vigente").length;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Lotes</h1>
        <p className="text-sm text-neutral-400 mt-1">Trazabilidad y vencimientos — FEFO</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Vencidos",         val: vencidos, color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200" },
          { label: "Críticos (≤7d)",   val: criticos, color: "text-orange-600",  bg: "bg-orange-50",  border: "border-orange-200" },
          { label: "Próximos (≤30d)",  val: proximos, color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200" },
          { label: "Vigentes",         val: vigentes, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg} ${k.border}`}>
            <p className="text-xs text-neutral-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      <LotesClient lotes={lotes} productos={productos} />
    </div>
  );
}
