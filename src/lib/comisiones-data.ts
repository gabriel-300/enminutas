import { calcularComisionOrden, proporcionEntregada, type LineaEntregaSnapshot } from "@/lib/comisiones";
import { COMISION_STATUSES } from "@/lib/order-status";
import { mesAR, rangoAnioAR } from "@/lib/fecha";
import { getParametros } from "@/lib/parametros";
import { listAllUsers } from "@/lib/supabase/users";
import { createAdminClient } from "@/lib/supabase/server";

export type ClienteMesAgg = { nombre: string; ventas: number; comisionLive: number; pct: number };

export type VendedorComision = {
  id: string;
  nombre: string;
  pct: number;
  pctConfigurado: boolean;
  esComercializadora: boolean;
};

export type ComisionesAnio = {
  vendedores: VendedorComision[];
  comercializadoraId: string | null;
  /** vendedorId → mes "YYYY-MM" → clienteId → agregado. Único lugar donde se calcula la comisión. */
  agg: Record<string, Record<string, Record<string, ClienteMesAgg>>>;
};

/**
 * Comisiones de un año, por vendedor × mes × cliente. La usan /admin/comisiones, su export CSV y
 * la tarjeta de /admin/preventista, para que los tres muestren el mismo número.
 *
 * Criterio: la comisión se devenga cuando el pedido está ENTREGADO (delivered, entrega_parcial o
 * liquidado) y cae en el mes de la entrega (entregado_at, hora Argentina). Si el pedido no tiene
 * entregado_at (datos viejos) se usa created_at. Antes se contaba desde "aprobado" y en el mes de
 * creación.
 *
 * Base del pedido: lo entregado (en una entrega parcial, total × proporción entregada) o, si se
 * cobró "sin factura", lo efectivamente cobrado.
 *
 * Pool de comisión del cliente = lo que realmente tiene cargado en su precio (comision_pct_override,
 * o el % global si no tiene override — así un cliente con override 0 da comisión $0 para todos).
 * El preventista asignado se queda con su % (tope: el pool del cliente); la comercializadora, con
 * el resto del pool.
 */
export async function cargarComisionesAnio(anio: number): Promise<ComisionesAnio> {
  const db = createAdminClient() as any;
  const { iva_pct, comision_pct } = await getParametros();

  // ── Vendedores (preventistas + la comercializadora) ────────────────────
  const allUsers = (await listAllUsers()) as any[];
  const vendedoresUsers = allUsers.filter((u: any) => u.app_metadata?.role === "vendedor");
  const vendedorIds = vendedoresUsers.map((u: any) => u.id as string);

  // Sin % configurado explícitamente = sin comisión (no se asume el default global), igual que
  // en /admin/preventista ("Aún no tenés comisión asignada").
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

  const vendedores: VendedorComision[] = vendedoresUsers
    .map((u: any) => ({
      id:                 u.id as string,
      nombre:             (u.user_metadata?.full_name as string | undefined) ?? (u.email as string | undefined) ?? (u.id as string),
      pct:                pctMap[u.id] ?? 0,
      pctConfigurado:     pctConfiguradoMap[u.id] ?? false,
      esComercializadora: u.id === comercializadoraId,
    }))
    .sort((a, b) => (a.esComercializadora === b.esComercializadora ? a.nombre.localeCompare(b.nombre) : a.esComercializadora ? -1 : 1));

  // ── Clientes B2B: vendedor asignado + % de comisión que tienen en su precio ─
  // profiles.role no es confiable para distinguir B2B de B2C (desincronizado en producción) —
  // b2b_status sí lo es, se setea únicamente en el alta como cliente B2B.
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

  // ── Pedidos entregados en el año (por fecha de entrega; created_at si no la tiene) ─
  const { desde, hasta } = rangoAnioAR(anio);
  const { data: rawOrders } = clienteIds.length > 0
    ? await db.from("orders")
        .select("id, customer_id, total, created_at, entregado_at, delivered_snapshot")
        .eq("channel", "b2b_mayorista")
        .in("customer_id", clienteIds)
        .in("status", COMISION_STATUSES)
        .or(
          `and(entregado_at.gte.${desde},entregado_at.lte.${hasta}),` +
          `and(entregado_at.is.null,created_at.gte.${desde},created_at.lte.${hasta})`,
        )
    : { data: [] };
  const orders = (rawOrders ?? []) as any[];
  const orderIds = orders.map((o) => o.id);

  // Pedidos cobrados "sin factura": la comisión de esos pedidos se calcula sobre lo
  // efectivamente cobrado, no sobre el total con IVA.
  const { data: pagosSinFactura } = orderIds.length > 0
    ? await db.from("pagos").select("order_id, monto").in("order_id", orderIds).eq("sin_factura", true)
    : { data: [] };
  const netoSinFacturaMap: Record<string, number> = {};
  for (const p of (pagosSinFactura ?? []) as any[]) {
    if (!p.order_id) continue;
    netoSinFacturaMap[p.order_id] = (netoSinFacturaMap[p.order_id] ?? 0) + Number(p.monto);
  }

  // Pedidos con entrega parcial: se traen sus líneas para ponderar lo entregado. Se filtra por
  // snapshot y no por status porque un parcial que después pasa a "liquidado" conserva su snapshot.
  const snapshotDe = (o: any): LineaEntregaSnapshot[] | null =>
    Array.isArray(o.delivered_snapshot?.lineas) && o.delivered_snapshot.lineas.length > 0
      ? o.delivered_snapshot.lineas
      : null;
  const parcialIds = orders.filter((o) => snapshotDe(o)).map((o) => o.id);
  const { data: rawLineas } = parcialIds.length > 0
    ? await db.from("order_lines").select("order_id, product_id, line_total").in("order_id", parcialIds)
    : { data: [] };
  const lineasPorOrden: Record<string, { product_id: string; line_total: number }[]> = {};
  for (const l of (rawLineas ?? []) as any[]) {
    (lineasPorOrden[l.order_id] ??= []).push({ product_id: l.product_id, line_total: Number(l.line_total) });
  }

  // ── Repartir cada pedido entre el preventista asignado y la comercializadora ─
  // Se agrega por vendedor × mes × cliente (no solo vendedor × mes) para poder pagar cliente por cliente.
  const agg: ComisionesAnio["agg"] = {};

  function sumar(vid: string, mesKey: string, clienteId: string, ventas: number, comisionMonto: number, pctEfectivo: number) {
    agg[vid] ??= {};
    agg[vid][mesKey] ??= {};
    const fila = (agg[vid][mesKey][clienteId] ??= {
      nombre: clienteNombreMap[clienteId] ?? "—", ventas: 0, comisionLive: 0, pct: pctEfectivo,
    });
    fila.ventas       += ventas;
    fila.comisionLive += comisionMonto;
    fila.pct           = pctEfectivo;
  }

  for (const o of orders) {
    const customerId = o.customer_id;
    const mesKey = mesAR(o.entregado_at ?? o.created_at);
    const entregado = Number(o.total) * proporcionEntregada(lineasPorOrden[o.id] ?? [], snapshotDe(o));
    const base = netoSinFacturaMap[o.id] ?? entregado;

    const poolPct = clientePoolPctMap[customerId] ?? comision_pct;

    const assignedVid = clienteVendedorMap[customerId];
    const assignedEsOtroQueLaComercializadora = assignedVid && assignedVid !== comercializadoraId;
    const assignedPct = assignedEsOtroQueLaComercializadora ? (pctMap[assignedVid!] ?? 0) : 0;

    const comision = calcularComisionOrden({ base, ivaPct: iva_pct, poolPct, preventistaPct: assignedPct });

    if (assignedEsOtroQueLaComercializadora) {
      sumar(assignedVid!, mesKey, customerId, entregado, comision.preventista, comision.preventistaPct);
    }
    if (comercializadoraId) {
      sumar(comercializadoraId, mesKey, customerId, entregado, comision.comercializadora, comision.comercializadoraPct);
    }
  }

  return { vendedores, comercializadoraId, agg };
}
