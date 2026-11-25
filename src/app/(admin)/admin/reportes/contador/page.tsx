import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertTriangle, Download } from "lucide-react";
import { Card, CardHeader, KpiCard, PageHeader } from "@/components/ui";
import { ReportesFilter } from "@/components/admin/reportes-filter";
import { fmt } from "@/lib/format";
import { loadContador } from "./_data";

export const metadata: Metadata = { title: "Exportes para el contador — Admin En Minutas" };
export const revalidate = 0;

function DownloadLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 hover:border-brand-700 hover:bg-brand-700/5 transition-colors"
    >
      <Download className="size-4 text-brand-700 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-600">{sub}</p>
      </div>
    </a>
  );
}

export default async function ContadorPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const d = await loadContador(sp.mes);

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16 space-y-5 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Exportes para el contador"
          subtitle={<span className="capitalize">{d.mesNombre}</span>}
        />
        <ReportesFilter mes={d.mesParam} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Compras del mes" value={fmt(d.comprasTotales.total)} footer={`${d.comprasCantidad} comprobante${d.comprasCantidad !== 1 ? "s" : ""}`} />
        <KpiCard label="Ventas reconocidas" value={fmt(d.ventasTotal)} footer={`${d.ventasCantidad} pedido${d.ventasCantidad !== 1 ? "s" : ""} entregado${d.ventasCantidad !== 1 ? "s" : ""}`} />
      </div>

      <Card>
        <CardHeader title="Libro IVA Compras" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-neutral-600 text-xs">Neto</p><p className="font-medium tabular-nums">{fmt(d.comprasTotales.neto)}</p></div>
            <div><p className="text-neutral-600 text-xs">IVA</p><p className="font-medium tabular-nums">{fmt(d.comprasTotales.iva)}</p></div>
            <div><p className="text-neutral-600 text-xs">Otros impuestos</p><p className="font-medium tabular-nums">{fmt(d.comprasTotales.otros)}</p></div>
          </div>
          {d.porGrupo.length > 0 && (
            <ul className="divide-y divide-neutral-100 border border-neutral-100 rounded-lg">
              {d.porGrupo.map(g => (
                <li key={g.label} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-neutral-700">{g.label}</span>
                  <span className="text-neutral-600">{g.cantidad} · <span className="font-medium text-neutral-900">{fmt(g.total)}</span></span>
                </li>
              ))}
            </ul>
          )}
          <DownloadLink href={`/api/admin/export/libro-iva-compras?mes=${d.mesParam}`} label="Libro IVA Compras (CSV)" sub="Todas las facturas, remitos y gastos del mes, con CUIT y desglose" />
          <DownloadLink href={`/api/admin/export/gastos-categoria?mes=${d.mesParam}`} label="Gastos por categoría (CSV)" sub="Agrupado: materia prima / gastos de fábrica / estructura" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Libro IVA Ventas" />
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-warning-bg border border-warning-border px-3 py-2">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              Borrador: todavía no hay facturación electrónica, así que el IVA sale de dividir el total del pedido
              (no de una factura real). Confirmar el formato final con el contador antes de usarlo para declarar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-neutral-600 text-xs">Neto (aprox.)</p><p className="font-medium tabular-nums">{fmt(d.ventasNeto)}</p></div>
            <div><p className="text-neutral-600 text-xs">IVA (aprox.)</p><p className="font-medium tabular-nums">{fmt(d.ventasIva)}</p></div>
          </div>
          <DownloadLink href={`/api/admin/export/libro-iva-ventas?mes=${d.mesParam}`} label="Libro IVA Ventas — borrador (CSV)" sub="Pedidos entregados en el mes, canal y cliente" />
        </div>
      </Card>

      <p className="text-xs text-neutral-600 px-1">
        Ventas reconocidas = pedidos entregados, con entrega parcial o ya liquidados (mismo criterio que comisiones). Compras = toda factura, remito o gasto cargado en el mes.
      </p>
    </div>
  );
}
