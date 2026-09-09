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

  // ── Vendedores (preventistas + la comercializadora) ────────────────────
  const { data: listUsersData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = (listUsersData?.users ?? []) as any[];
  const vendedoresUsers = allUsers.filter((u: any) => u.app_metadata?.role === "vendedor");
  const vendedorIds = vendedoresUsers.map((u: any) => u.id as string);

  // Sin % configurado explícitamente = sin comisión (no se asume el default
  // global), igual que en /admin/preventista ("Aún no tenés comisión asignada").
  const { data: perfilesVendedores } = vendedorIds.length > 0
    ? await db.from("profiles").select("id, comision_preventista_pct, es_comercializadora").in("id", vendedorIds)
    : { data: [] };
  const pctMap:            Record<string, number>  = {};
  const pctConfiguradoMap: Record<string, boolean> = {};
  let comercializadoraId: string | null = null;
  for (const p of (perfilesVendedores ?? []) as any[]) {
    pctConfiguradoMap[p.id] = p.comision_preventista_pct != null;
    pctMap[p.id] = p.comision_preventista_pct != null ? Number(p.comision_preventista_pct) : 0;
    if (p.es_comercializadora) comercializadoraId = p.id;
  }

  const vendedores = vendedoresUsers
    .map((u: any) => ({
      id:             u.id as string,
      nombre:         (u.user_metadata?.full_name as string | undefined) ?? (u.email as string | undefined) ?? (u.id as string),
      pct:            pctMap[u.id] ?? 0,
      pctConfigurado: pctConfiguradoMap[u.id] ?? false,
      esComercializadora: u.id === comercializadoraId,
    }))
    .sort((a: any, b: any) => (a.esComercializadora === b.esComercializadora ? a.nombre.localeCompare(b.nombre) : a.esComercializadora ? -1 : 1));

  // ── Clientes B2B: vendedor asignado + % de comisión que tienen en su precio ─
  // profiles.role no es confiable para distinguir B2B de B2C (desincronizado
  // en producción, igual que pasa con el role de staff) — b2b_status sí lo es,
  // se setea únicamente en el alta como cliente B2B.
  const { data: perfilesClientes } = await db
    .from("profiles")
    .select("id, full_name, vendedor_id, comision_pct_override")
    .not("b2b_status", "is", null);
  const clienteVendedorMap: Record<string, string | null> = {};
  const clientePoolPctMap:  Record<string, number>        = {};
  const clienteNombreMap:   Record<string, string>        = {};
  for (const c of (perfilesClientes ?? []) as any[]) {
    clienteVendedorMap[c.id] = c.vendedor_id ?? null;
    clientePoolPctMap[c.id]  = c.comision_pct_override != null ? Number(c.comision_pct_override) : comision_pct;
    clienteNombreMap[c.id]   = c.full_name ?? "—";
  }
  const clienteIds = Object.keys(clienteVendedorMap);

  // ── Pedidos de todo el año seleccionado ────────────────────────────────
  const yearStart = new Date(selYear, 0, 1).toISOString();
  const yearEnd   = new Date(selYear, 11, 31, 23, 59, 59).toISOString();

  const { data: rawOrders } = clienteIds.length > 0
    ? await db.from("orders")
        .select("id, customer_id, total, created_at")
        .eq("channel", "b2b_mayorista")
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

  // ── Repartir cada pedido entre el preventista asignado y la comercializadora ─
  // Pool de comisión del cliente = lo que realmente tiene cargado en su precio
  // (comision_pct_override, o el % global si no tiene override — así los
  // clientes con override 0 dan comisión $0 para todos, sin reglas aparte).
  // El preventista asignado se queda con su % (tope: el pool del cliente);
  // la comercializadora se queda con el resto del pool.
  // Se agrega por vendedor × mes × cliente (no solo vendedor × mes) para poder
  // pagar cliente por cliente.
  type ClienteMesAgg = { nombre: string; ventas: number; comisionLive: number; pct: number };
  const clientesPorVendedorMes: Record<string, Record<string, Record<string, ClienteMesAgg>>> = {};
  // vendedorId -> mesKey -> clienteId -> agg

  function sumar(vid: string, mesKey: string, clienteId: string, ventas: number, comisionMonto: number, pctEfectivo: number) {
    clientesPorVendedorMes[vid] ??= {};
    clientesPorVendedorMes[vid][mesKey] ??= {};
    const agg = (clientesPorVendedorMes[vid][mesKey][clienteId] ??= {
      nombre: clienteNombreMap[clienteId] ?? "—", ventas: 0, comisionLive: 0, pct: pctEfectivo,
    });
    agg.ventas        += ventas;
    agg.comisionLive  += comisionMonto;
    agg.pct            = pctEfectivo;
  }

  for (const o of orders) {
    const customerId = o.customer_id;
    const d = new Date(o.created_at);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const total = Number(o.total);
    const base  = netoSinFacturaMap[o.id] ?? total;

    const poolPct       = clientePoolPctMap[customerId] ?? comision_pct;
    const divisorCliente = 1 + iva_pct + poolPct;
    const comisionTotalOrden = poolPct > 0 ? (base * poolPct) / divisorCliente : 0;

    const assignedVid = clienteVendedorMap[customerId];
    const assignedEsOtroQueLaComercializadora = assignedVid && assignedVid !== comercializadoraId;
    const assignedPct = assignedEsOtroQueLaComercializadora ? (pctMap[assignedVid!] ?? 0) : 0;
    const preventistaPctEfectivo = Math.min(assignedPct, poolPct);

    const comisionPreventista = poolPct > 0 ? (base * preventistaPctEfectivo) / divisorCliente : 0;
    const comisionResto       = comisionTotalOrden - comisionPreventista;

    if (assignedEsOtroQueLaComercializadora) {
      sumar(assignedVid!, mesKey, customerId, total, comisionPreventista, preventistaPctEfectivo);
    }
    if (comercializadoraId) {
      const pctResto = Math.max(poolPct - preventistaPctEfectivo, 0);
      sumar(comercializadoraId, mesKey, customerId, total, comisionResto, pctResto);
    }
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
    <div className="p-4 md:p-8 max-w-6xl space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Comisiones</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Comisión de preventistas y comercializadora, por cliente, mes y año — lo que hay que pagarles.
          </p>
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

      {!comercializadoraId && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          No hay ningún vendedor marcado como "comercializadora" — el resto de la comisión de cada cliente
          (lo que no se lleva el preventista asignado) no se le está atribuyendo a nadie.
        </div>
      )}

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
          <div key={f.id} className={`bg-white rounded-2xl border overflow-hidden ${f.esComercializadora ? "border-tierra-300" : "border-neutral-200"}`}>
            <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                  {f.nombre}
                  {f.esComercializadora && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-tierra-50 text-tierra-700">
                      Comercializadora
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Ventas {mesLabel}: {fmt(f.mesSelData.ventas)}
                  {" · "}
                  {f.esComercializadora ? (
                    <span>resto de la comisión de cada cliente (según % configurado en cada uno)</span>
                  ) : f.pctConfigurado ? (
                    `${Math.round(f.pct * 100)}% comisión (tope: el % de cada cliente)`
                  ) : (
                    <span className="text-neutral-300">sin comisión asignada</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold font-display tabular-nums text-neutral-900">{fmt(f.mesSelData.comision)}</p>
                {f.mesSelData.pagada && f.mesSelData.comision > 0 && (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ Todo pagado</span>
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
                    <td className="px-4 py-2.5 text-neutral-700 font-medium sticky left-0 bg-white whitespace-nowrap">
                      {f.nombre}{f.esComercializadora && " ★"}
                    </td>
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
          <p className="px-5 py-2.5 text-[11px] text-neutral-400 border-t border-neutral-50">✓ = comisión marcada como pagada · ★ = comercializadora</p>
        </div>
      )}
    </div>
  );
}
