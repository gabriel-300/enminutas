import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getParametros } from "@/lib/parametros";
import { MesSelector } from "./mes-selector";
import { ComisionAcciones } from "./comision-acciones";

export const metadata: Metadata = { title: "Comisiones — Admin En Minutas" };
export const revalidate = 0;

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered", "liquidado"];

const MESES_LABEL = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
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
  const now = new Date();
  const mesSel = mesParam && /^\d{4}-\d{2}$/.test(mesParam)
    ? mesParam
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selYear] = mesSel.split("-").map(Number);

  const db = createAdminClient() as any;
  const { iva_pct, comision_pct } = await getParametros();
  const divisorPrecio = 1 + iva_pct + comision_pct;

  // ── Vendedores ──────────────────────────────────────────────────────────
  const { data: listUsersData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = (listUsersData?.users ?? []) as any[];
  const vendedoresUsers = allUsers.filter((u: any) => u.app_metadata?.role === "vendedor");
  const vendedorIds = vendedoresUsers.map((u: any) => u.id as string);

  const { data: perfilesVendedores } = vendedorIds.length > 0
    ? await db.from("profiles").select("id, comision_preventista_pct").in("id", vendedorIds)
    : { data: [] };
  const pctMap: Record<string, number> = {};
  for (const p of (perfilesVendedores ?? []) as any[]) {
    pctMap[p.id] = p.comision_preventista_pct != null ? Number(p.comision_preventista_pct) : comision_pct;
  }

  const vendedores = vendedoresUsers
    .map((u: any) => ({
      id:     u.id as string,
      nombre: (u.user_metadata?.full_name as string | undefined) ?? (u.email as string | undefined) ?? (u.id as string),
      pct:    pctMap[u.id] ?? comision_pct,
    }))
    .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

  // ── Clientes asignados a cada vendedor ─────────────────────────────────
  const { data: perfilesClientes } = vendedorIds.length > 0
    ? await db.from("profiles").select("id, full_name, vendedor_id").in("vendedor_id", vendedorIds)
    : { data: [] };
  const clienteVendedorMap: Record<string, string> = {};
  const clienteNombreMap:   Record<string, string> = {};
  for (const c of (perfilesClientes ?? []) as any[]) {
    if (!c.vendedor_id) continue;
    clienteVendedorMap[c.id] = c.vendedor_id;
    clienteNombreMap[c.id]   = c.full_name ?? "—";
  }
  const clienteIds = Object.keys(clienteVendedorMap);

  // ── Pedidos de todo el año seleccionado ────────────────────────────────
  const yearStart = new Date(selYear, 0, 1).toISOString();
  const yearEnd   = new Date(selYear, 11, 31, 23, 59, 59).toISOString();

  const { data: rawOrders } = clienteIds.length > 0
    ? await db.from("orders")
        .select("id, customer_id, total, created_at")
        .in("customer_id", clienteIds)
        .in("status", ACTIVE_STATUSES)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
    : { data: [] };
  const orders = (rawOrders ?? []) as any[];
  const orderIds = orders.map((o) => o.id);

  // Pedidos cobrados "sin factura": la comisión de esos pedidos se calcula
  // sobre lo efectivamente cobrado, no sobre el total con IVA.
  const { data: pagosSinFactura } = orderIds.length > 0
    ? await db.from("pagos").select("order_id, monto").in("order_id", orderIds).eq("sin_factura", true)
    : { data: [] };
  const netoSinFacturaMap: Record<string, number> = {};
  for (const p of (pagosSinFactura ?? []) as any[]) {
    if (!p.order_id) continue;
    netoSinFacturaMap[p.order_id] = (netoSinFacturaMap[p.order_id] ?? 0) + Number(p.monto);
  }

  // ── Comisiones ya marcadas como pagadas este año ───────────────────────
  const { data: rawPagosComision } = vendedorIds.length > 0
    ? await db.from("comisiones_pagos").select("*").in("vendedor_id", vendedorIds).like("mes", `${selYear}-%`)
    : { data: [] };
  type PagoComisionRow = {
    vendedor_id: string; mes: string; monto: number; pct: number;
    ventas_base: number; fecha_pago: string; notas: string | null;
  };
  const pagoComisionMap: Record<string, PagoComisionRow> = {};
  for (const p of (rawPagosComision ?? []) as PagoComisionRow[]) {
    pagoComisionMap[`${p.vendedor_id}_${p.mes}`] = p;
  }

  // ── Agregación por vendedor × mes, y por cliente (solo mes seleccionado) ─
  type MesAgg = { ventas: number; base: number };
  const aggMap: Record<string, Record<string, MesAgg>> = {};
  type ClienteAgg = { id: string; nombre: string; total: number; base: number };
  const clientesPorVendedor: Record<string, Record<string, ClienteAgg>> = {};

  for (const o of orders) {
    const vid = clienteVendedorMap[o.customer_id];
    if (!vid) continue;
    const d = new Date(o.created_at);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const total = Number(o.total);
    const base  = netoSinFacturaMap[o.id] ?? total;

    aggMap[vid] ??= {};
    aggMap[vid][mesKey] ??= { ventas: 0, base: 0 };
    aggMap[vid][mesKey].ventas += total;
    aggMap[vid][mesKey].base   += base;

    if (mesKey === mesSel) {
      clientesPorVendedor[vid] ??= {};
      clientesPorVendedor[vid][o.customer_id] ??= {
        id: o.customer_id, nombre: clienteNombreMap[o.customer_id] ?? "—", total: 0, base: 0,
      };
      clientesPorVendedor[vid][o.customer_id].total += total;
      clientesPorVendedor[vid][o.customer_id].base  += base;
    }
  }

  type MesRow = {
    mes: string; ventas: number; base: number; comision: number; comisionLive: number;
    pagada: boolean; fechaPago: string | null; pctUsado: number;
  };

  // ── Filas finales por vendedor ──────────────────────────────────────────
  const filas = vendedores.map((v) => {
    const meses: MesRow[] = Array.from({ length: 12 }, (_, i) => {
      const mesKey = `${selYear}-${String(i + 1).padStart(2, "0")}`;
      const agg  = aggMap[v.id]?.[mesKey] ?? { ventas: 0, base: 0 };
      const pago = pagoComisionMap[`${v.id}_${mesKey}`];
      const comisionLive = Math.round((agg.base * v.pct) / divisorPrecio);
      return {
        mes:        mesKey,
        ventas:     agg.ventas,
        base:       agg.base,
        comision:   pago ? Number(pago.monto) : comisionLive,
        comisionLive,
        pagada:     !!pago,
        fechaPago:  pago?.fecha_pago ?? null,
        pctUsado:   pago ? Number(pago.pct) : v.pct,
      };
    });

    const mesSelData = meses.find((m) => m.mes === mesSel)!;
    const clientesMes = Object.values(clientesPorVendedor[v.id] ?? {}).sort((a, b) => b.total - a.total);
    const totalAnual  = meses.reduce((s, m) => s + m.comision, 0);
    const pagadoAnual = meses.filter((m) => m.pagada).reduce((s, m) => s + m.comision, 0);

    return { ...v, meses, mesSelData, clientesMes, totalAnual, pagadoAnual };
  });

  const totalMesComision   = filas.reduce((s, f) => s + f.mesSelData.comision, 0);
  const totalMesPendiente  = filas.filter((f) => !f.mesSelData.pagada).reduce((s, f) => s + f.mesSelData.comision, 0);
  const totalAnioComision  = filas.reduce((s, f) => s + f.totalAnual, 0);
  const totalAnioPendiente = totalAnioComision - filas.reduce((s, f) => s + f.pagadoAnual, 0);

  const mesLabel = new Date(selYear, Number(mesSel.split("-")[1]) - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Comisiones</h1>
          <p className="text-sm text-neutral-500 mt-1">Comisión de preventistas por cliente, mes y año — lo que hay que pagarles.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/export/comisiones?mes=${mesSel}`}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Exportar mes (CSV)
          </a>
          <a
            href={`/api/admin/export/comisiones?anio=${selYear}`}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Exportar año (CSV)
          </a>
        </div>
      </div>

      {/* Selector de mes */}
      <MesSelector mes={mesSel} />

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Comisión total · {mesLabel}</p>
          <p className="text-2xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(totalMesComision)}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${totalMesPendiente > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Pendiente de pagar</p>
          <p className={`text-2xl font-semibold font-display tabular-nums ${totalMesPendiente > 0 ? "text-amber-700" : "text-neutral-900"}`}>{fmtK(totalMesPendiente)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Comisión total · {selYear}</p>
          <p className="text-2xl font-semibold font-display tabular-nums text-neutral-900">{fmtK(totalAnioComision)}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${totalAnioPendiente > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Pendiente del año</p>
          <p className={`text-2xl font-semibold font-display tabular-nums ${totalAnioPendiente > 0 ? "text-amber-700" : "text-neutral-900"}`}>{fmtK(totalAnioPendiente)}</p>
        </div>
      </div>

      {/* Detalle por vendedor — mes seleccionado */}
      <div className="space-y-3">
        {filas.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-8">No hay preventistas cargados.</p>
        )}
        {filas.map((f) => (
          <div key={f.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800">{f.nombre}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Ventas {mesLabel}: {fmt(f.mesSelData.ventas)}
                  {f.mesSelData.base !== f.mesSelData.ventas && (
                    <span className="text-amber-600"> · base comisión {fmt(f.mesSelData.base)} (desc. sin factura)</span>
                  )}
                  {" · "}{Math.round(f.mesSelData.pctUsado * 100)}% comisión
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xl font-semibold font-display tabular-nums text-neutral-900">{fmt(f.mesSelData.comision)}</p>
                <ComisionAcciones
                  vendedorId={f.id}
                  mes={mesSel}
                  comisionCalculada={f.mesSelData.comisionLive}
                  pct={f.pct}
                  ventasBase={f.mesSelData.base}
                  pagada={f.mesSelData.pagada}
                  fechaPago={f.mesSelData.fechaPago}
                  notas={null}
                />
              </div>
            </div>

            {f.clientesMes.length > 0 && (
              <details className="border-t border-neutral-100">
                <summary className="px-5 py-2.5 text-xs text-tierra-700 hover:underline cursor-pointer list-none">
                  Por cliente ({f.clientesMes.length}) →
                </summary>
                <ul className="divide-y divide-neutral-50">
                  {f.clientesMes.map((c) => (
                    <li key={c.id} className="px-5 py-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-neutral-600 truncate">{c.nombre}</span>
                      <span className="text-xs tabular-nums text-neutral-500 shrink-0">
                        {fmt(c.total)}
                        {c.base !== c.total && <span className="text-amber-600"> (base {fmt(c.base)})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Resumen anual */}
      {filas.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Resumen {selYear}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left px-4 py-2.5 text-neutral-400 font-medium sticky left-0 bg-white">Vendedor</th>
                  {MESES_LABEL.map((m) => (
                    <th key={m} className="text-right px-3 py-2.5 text-neutral-400 font-medium whitespace-nowrap">{m}</th>
                  ))}
                  <th className="text-right px-4 py-2.5 text-neutral-500 font-semibold whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className="border-b border-neutral-50">
                    <td className="px-4 py-2.5 text-neutral-700 font-medium sticky left-0 bg-white whitespace-nowrap">{f.nombre}</td>
                    {f.meses.map((m) => (
                      <td key={m.mes} className="text-right px-3 py-2.5 tabular-nums whitespace-nowrap">
                        {m.comision > 0 ? (
                          <span className={m.pagada ? "text-emerald-600" : "text-neutral-700"}>
                            {fmtK(m.comision)}{m.pagada && " ✓"}
                          </span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 font-semibold tabular-nums text-neutral-900 whitespace-nowrap">{fmtK(f.totalAnual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-2.5 text-[11px] text-neutral-400 border-t border-neutral-50">✓ = comisión marcada como pagada</p>
        </div>
      )}
    </div>
  );
}
