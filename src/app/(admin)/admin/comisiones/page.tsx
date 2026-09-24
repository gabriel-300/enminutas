import { cargarComisionesAnio } from "@/lib/comisiones-data";
import { mesAR, mesValido } from "@/lib/fecha";
import { fmt } from "@/lib/format";
import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MesSelector } from "./mes-selector";
import { ComisionAcciones } from "./comision-acciones";

export const metadata: Metadata = { title: "Comisiones — Admin En Minutas" };
export const revalidate = 0;


const MESES_LABEL = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmtK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return fmt(n);
};

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const { mes: mesParam } = await searchParams;
  const mesSel = mesValido(mesParam) ?? mesAR(new Date());
  const [selYear] = mesSel.split("-").map(Number);

  const db = createAdminClient() as any;

  // Vendedores y comisión por vendedor × mes × cliente (criterio: pedidos entregados).
  const { vendedores, comercializadoraId, agg: clientesPorVendedorMes } = await cargarComisionesAnio(selYear);
  const vendedorIds = vendedores.map((v) => v.id);

  // ── Comisiones ya marcadas como pagadas este año (por vendedor+mes+cliente) ─
  const { data: rawPagosComision } = vendedorIds.length > 0
    ? await db.from("comisiones_pagos").select("*").in("vendedor_id", vendedorIds).like("mes", `${selYear}-%`)
    : { data: [] };
  type PagoComisionRow = {
    vendedor_id: string; cliente_id: string; mes: string; monto: number; pct: number;
    ventas: number; fecha_pago: string; notas: string | null;
  };
  const pagoComisionMap: Record<string, PagoComisionRow> = {};
  for (const p of (rawPagosComision ?? []) as PagoComisionRow[]) {
    pagoComisionMap[`${p.vendedor_id}_${p.mes}_${p.cliente_id}`] = p;
  }

  type ComisionClienteRow = {
    id: string; nombre: string; ventas: number; comision: number; pct: number;
    pagado: boolean; fechaPago: string | null;
  };
  type MesRow = {
    mes: string; ventas: number; comision: number;
    pagada: boolean; clientes: ComisionClienteRow[];
  };

  // ── Filas finales por vendedor ──────────────────────────────────────────
  const filas = vendedores.map((v) => {
    const meses: MesRow[] = Array.from({ length: 12 }, (_, i) => {
      const mesKey = `${selYear}-${String(i + 1).padStart(2, "0")}`;
      const clientesAgg = clientesPorVendedorMes[v.id]?.[mesKey] ?? {};
      const clientes: ComisionClienteRow[] = Object.entries(clientesAgg)
        .map(([clienteId, agg]) => {
          const pago = pagoComisionMap[`${v.id}_${mesKey}_${clienteId}`];
          return {
            id:        clienteId,
            nombre:    agg.nombre,
            ventas:    agg.ventas,
            comision:  pago ? Number(pago.monto) : Math.round(agg.comisionLive),
            pct:       pago ? Number(pago.pct) : agg.pct,
            pagado:    !!pago,
            fechaPago: pago?.fecha_pago ?? null,
          };
        })
        .filter((c) => c.comision > 0 || c.ventas > 0)
        .sort((a, b) => b.comision - a.comision);

      const ventas   = clientes.reduce((s, c) => s + c.ventas, 0);
      const comision = clientes.reduce((s, c) => s + c.comision, 0);
      const pagada   = comision > 0 && clientes.every((c) => c.pagado);

      return { mes: mesKey, ventas, comision, pagada, clientes };
    });

    const mesSelData  = meses.find((m) => m.mes === mesSel)!;
    const totalAnual  = meses.reduce((s, m) => s + m.comision, 0);
    const pagadoAnual = meses.reduce((s, m) => s + m.clientes.filter((c) => c.pagado).reduce((s2, c) => s2 + c.comision, 0), 0);

    return { ...v, meses, mesSelData, totalAnual, pagadoAnual };
  });

  const totalMesComision  = filas.reduce((s, f) => s + f.mesSelData.comision, 0);
  const totalMesPendiente = filas.reduce(
    (s, f) => s + f.mesSelData.clientes.filter((c) => !c.pagado).reduce((s2, c) => s2 + c.comision, 0),
    0,
  );
  const totalAnioComision  = filas.reduce((s, f) => s + f.totalAnual, 0);
  const totalAnioPendiente = totalAnioComision - filas.reduce((s, f) => s + f.pagadoAnual, 0);

  const mesLabel = new Date(selYear, Number(mesSel.split("-")[1]) - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16 space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Comisiones</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Comisión de preventistas y comercializadora, por cliente, mes y año — lo que hay que pagarles.
            Se cuenta cuando el pedido se entrega, en el mes de la entrega (en una entrega parcial, solo lo entregado).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/export/comisiones?mes=${mesSel}`}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-n-btn rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
          >
            Exportar mes (CSV)
          </a>
          <a
            href={`/api/admin/export/comisiones?anio=${selYear}`}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-n-btn rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
          >
            Exportar año (CSV)
          </a>
        </div>
      </div>

      {!comercializadoraId && (
        <div className="px-4 py-3 rounded-xl bg-warning-bg border border-warning-border text-xs text-warning">
          No hay ningún vendedor marcado como "comercializadora" — el resto de la comisión de cada cliente
          (lo que no se lleva el preventista asignado) no se le está atribuyendo a nadie.
        </div>
      )}

      {/* Selector de mes */}
      <MesSelector mes={mesSel} />

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs font-medium text-neutral-600 mb-1">Comisión total · {mesLabel}</p>
          <p className="text-2xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(totalMesComision)}</p>
        </div>
        <div className={`rounded-xl border p-5 ${totalMesPendiente > 0 ? "bg-warning-bg border-warning-border" : "bg-white border-neutral-200"}`}>
          <p className="text-xs font-medium text-neutral-600 mb-1">Pendiente de pagar</p>
          <p className={`text-2xl font-semibold font-display tabular-nums ${totalMesPendiente > 0 ? "text-warning" : "text-neutral-900"}`}>{fmtK(totalMesPendiente)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs font-medium text-neutral-600 mb-1">Comisión total · {selYear}</p>
          <p className="text-2xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(totalAnioComision)}</p>
        </div>
        <div className={`rounded-xl border p-5 ${totalAnioPendiente > 0 ? "bg-warning-bg border-warning-border" : "bg-white border-neutral-200"}`}>
          <p className="text-xs font-medium text-neutral-600 mb-1">Pendiente del año</p>
          <p className={`text-2xl font-semibold font-display tabular-nums ${totalAnioPendiente > 0 ? "text-warning" : "text-neutral-900"}`}>{fmtK(totalAnioPendiente)}</p>
        </div>
      </div>

      {/* Detalle por vendedor — mes seleccionado */}
      <div className="space-y-3">
        {filas.length === 0 && (
          <p className="text-sm text-neutral-600 text-center py-8">No hay preventistas cargados.</p>
        )}
        {filas.map((f) => (
          <div key={f.id} className={`bg-white rounded-xl border overflow-hidden ${f.esComercializadora ? "border-tierra-300" : "border-neutral-200"}`}>
            <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                  {f.nombre}
                  {f.esComercializadora && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-tierra-50 text-tierra-700">
                      Comercializadora
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Entregado {mesLabel}: {fmt(f.mesSelData.ventas)}
                  {" · "}
                  {f.esComercializadora ? (
                    <span>resto de la comisión de cada cliente (según % configurado en cada uno)</span>
                  ) : f.pctConfigurado ? (
                    `${Math.round(f.pct * 100)}% comisión (tope: el % de cada cliente)`
                  ) : (
                    <span className="text-neutral-500">sin comisión asignada</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold font-display tabular-nums text-neutral-900">{fmt(f.mesSelData.comision)}</p>
                {f.mesSelData.pagada && f.mesSelData.comision > 0 && (
                  <span className="text-xs font-medium text-success bg-success-bg px-1.5 py-0.5 rounded">✓ Todo pagado</span>
                )}
              </div>
            </div>

            {f.mesSelData.clientes.length > 0 && (
              <details className="border-t border-neutral-100" open={!f.mesSelData.pagada}>
                <summary className="px-5 py-2.5 text-xs text-tierra-700 hover:underline cursor-pointer list-none">
                  Por cliente ({f.mesSelData.clientes.length}) →
                </summary>
                <ComisionAcciones vendedorId={f.id} mes={mesSel} clientes={f.mesSelData.clientes} />
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Resumen anual */}
      {filas.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100">
            <p className="text-xs font-semibold text-neutral-600">Resumen {selYear}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-xs text-left px-4 py-2.5 text-neutral-600 font-semibold sticky left-0 bg-white">Vendedor</th>
                  {MESES_LABEL.map((m) => (
                    <th key={m} className="text-right px-3 py-2.5 text-neutral-600 font-medium whitespace-nowrap">{m}</th>
                  ))}
                  <th className="text-xs text-right px-4 py-2.5 text-neutral-600 font-semibold whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className="border-b border-neutral-50">
                    <td className="px-4 py-2.5 text-neutral-700 font-medium sticky left-0 bg-white whitespace-nowrap">
                      {f.nombre}{f.esComercializadora && " ★"}
                    </td>
                    {f.meses.map((m) => (
                      <td key={m.mes} className="text-right px-3 py-2.5 tabular-nums whitespace-nowrap">
                        {m.comision > 0 ? (
                          <span className={m.pagada ? "text-success" : "text-neutral-700"}>
                            {fmtK(m.comision)}{m.pagada && " ✓"}
                          </span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 font-semibold tabular-nums text-neutral-900 whitespace-nowrap">{fmtK(f.totalAnual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-2.5 text-xs text-neutral-600 border-t border-neutral-50">✓ = comisión marcada como pagada · ★ = comercializadora</p>
        </div>
      )}
    </div>
  );
}
