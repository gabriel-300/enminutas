import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FacturacionClient } from "./facturacion-client";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Facturación — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export function numeroComprobante(tipo: string, pv: number, numero: number | null) {
  if (!numero) return "BORRADOR";
  return `${tipo} ${String(pv).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; mes?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const now   = new Date();
  const mes   = sp.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = mes.split("-").map(Number);
  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const hasta = new Date(year, month, 1).toISOString().split("T")[0];

  // Todas las facturas del mes
  let q = db
    .from("facturas")
    .select("id, tipo, punto_venta, numero, razon_social, cuit, total, estado, fecha_emision, created_at, condicion_pago, condicion_iva")
    .gte("created_at", desde)
    .lt("created_at", hasta)
    .order("created_at", { ascending: false });

  if (sp.estado && sp.estado !== "todas") q = q.eq("estado", sp.estado);

  const { data: facturas } = await q;
  const rows = (facturas ?? []) as any[];

  // KPIs del mes (sin filtro de estado)
  const { data: kpiData } = await db
    .from("facturas")
    .select("total, estado")
    .gte("created_at", desde)
    .lt("created_at", hasta);

  const kpi = (kpiData ?? []) as any[];
  const totalMes      = kpi.filter((f: any) => f.estado !== "anulada").reduce((s: number, f: any) => s + Number(f.total), 0);
  const pendienteCobro = kpi.filter((f: any) => f.estado === "emitida").reduce((s: number, f: any) => s + Number(f.total), 0);
  const cantMes       = kpi.filter((f: any) => f.estado !== "anulada").length;

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Facturación</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {MESES[month - 1]} {year}
          </p>
        </div>
        <Link
          href="/admin/facturacion/nueva"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors shrink-0"
        >
          <Plus className="size-4" />
          Nueva factura
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Facturado este mes",   value: fmt(totalMes),       sub: `${cantMes} comprobante${cantMes !== 1 ? "s" : ""}` },
          { label: "Pendiente de cobro",   value: fmt(pendienteCobro), sub: "facturas emitidas" },
          { label: "Ticket promedio",      value: cantMes > 0 ? fmt(totalMes / cantMes) : fmt(0), sub: "por comprobante" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-neutral-200 p-4">
            <p className="text-xs text-neutral-400 mb-1">{label}</p>
            <p className="text-xl font-semibold font-display text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <FacturacionClient facturas={rows} mes={mes} estadoFiltro={sp.estado ?? "todas"} />

      {/* Aviso AFIP */}
      <p className="mt-6 text-xs text-neutral-400 text-center">
        ⚠ Los comprobantes no tienen validez fiscal hasta la integración con ARCA/AFIP.
      </p>
    </div>
  );
}
