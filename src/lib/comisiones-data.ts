import { calcularComisionOrden } from "@/lib/comisiones";
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
 * liquidado) Y tiene entregado_at: cae en el mes de la entrega (hora Argentina). Un pedido liquidado
 * sin entrega confirmada no comisiona. Antes se contaba desde "aprobado" y en el mes de creación.
 *
 * Base del pedido: su total (que en una entrega parcial ya es lo entregado) sin el cargo adicional
 * manual. Es la misma con o sin factura: la comisión ya viene incluida en el precio de lista, y que
 * el cliente pague sin factura (sin IVA) es un acuerdo con la empresa que no cambia lo que cobran
 * preventista y comercializadora. El flete CIF incluido en el precio (orders.flete_pct) se saca en
 * el divisor de calcularComisionOrden.
 *
 * Devoluciones aprobadas: descuentan su comisión (mismo cálculo, signo negativo) en el mes de la
 * devolución, con el % vigente del cliente.
 *
 * Pool de comisión del pedido = lo que su precio llevó incluido: orders.comision_pct (guardado al crear
 * el pedido) o, en pedidos viejos, comision_pct_override del cliente / el % global — así un cliente con
 * override 0 da comisión $0 para todos, y cambiar el % de un cliente no toca los pedidos ya vendidos.
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
  const { data: perfilesClientes, error: errClientes } = await db
    .from("profiles")
    .select("id, full_name, vendedor_id, comision_pct_override")
    .not("b2b_status", "is", null);
  if (errClientes) throw new Error(`No se pudieron leer los clientes para las comisiones: ${errClientes.message}`);
  const clienteVendedorMap: Record<string, string | null> = {};
  const clientePoolPctMap:  Record<string, number>        = {};
  const clienteNombreMap:   Record<string, string>        = {};
  for (const c of (perfilesClientes ?? []) as any[]) {
    clienteVendedorMap[c.id] = c.vendedor_id ?? null;
    clientePoolPctMap[c.id]  = c.comision_pct_override != null ? Number(c.comision_pct_override) : comision_pct;
    clienteNombreMap[c.id]   = c.full_name ?? "—";
  }

  // ── Pedidos entregados en el año (por fecha de entrega) ────────────────
  // Sin entregado_at no hay entrega confirmada: un pedido puede estar "liquidado" (pagado) sin haberse
  // entregado, y ese no comisiona todavía.
  const { desde, hasta } = rangoAnioAR(anio);
  // PostgREST corta en 1000 filas por consulta: se pagina para no perder pedidos sin aviso (un año
  // de pedidos ya se acerca a ese tope). Los clientes B2B se filtran en memoria, no con .in() en la
  // URL, que con muchos clientes se pasa del largo permitido.
  const PAGINA = 1000;
  const orders: any[] = [];
  for (let desdeFila = 0; ; desdeFila += PAGINA) {
    const { data, error } = await db.from("orders")
      .select("id, customer_id, total, entregado_at, flete_pct, comision_pct, cargo_adicional_monto")
      .eq("channel", "b2b_mayorista")
      .in("status", COMISION_STATUSES)
      .gte("entregado_at", desde)
      .lte("entregado_at", hasta)
      .order("entregado_at", { ascending: true })
      .order("id", { ascending: true })
      .range(desdeFila, desdeFila + PAGINA - 1);
    // Mejor un error visible que comisiones en $0 que parecen reales.
    if (error) throw new Error(`No se pudieron leer los pedidos para las comisiones: ${error.message}`);
    orders.push(...(data ?? []));
    if ((data ?? []).length < PAGINA) break;
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

  // signo = 1 para una entrega, -1 para una devolución (descuenta lo mismo que había comisionado).
  function repartir(customerId: string, mesKey: string, ventas: number, base: number, poolPct: number, fletePct: number, signo: 1 | -1) {
    const assignedVid = clienteVendedorMap[customerId];
    const assignedEsOtroQueLaComercializadora = assignedVid && assignedVid !== comercializadoraId;
    const assignedPct = assignedEsOtroQueLaComercializadora ? (pctMap[assignedVid!] ?? 0) : 0;

    const comision = calcularComisionOrden({ base, ivaPct: iva_pct, poolPct, preventistaPct: assignedPct, fletePct });

    if (assignedEsOtroQueLaComercializadora) {
      sumar(assignedVid!, mesKey, customerId, signo * ventas, signo * comision.preventista, comision.preventistaPct);
    }
    if (comercializadoraId) {
      sumar(comercializadoraId, mesKey, customerId, signo * ventas, signo * comision.comercializadora, comision.comercializadoraPct);
    }
  }

  for (const o of orders) {
    const customerId = o.customer_id;
    if (!(customerId in clienteVendedorMap)) continue; // no es un cliente B2B

    const entregado = Number(o.total);
    // Un cargo adicional manual (flete, IIBB, etc.) se cobra aparte del precio: no es base de comisión.
    const base = Math.max(entregado - Number(o.cargo_adicional_monto ?? 0), 0);
    // El % que el precio de ESTE pedido llevó incluido (guardado al crearlo); en pedidos anteriores a esa
    // columna, el vigente del cliente.
    const poolPct = o.comision_pct != null ? Number(o.comision_pct) : (clientePoolPctMap[customerId] ?? comision_pct);

    repartir(customerId, mesAR(o.entregado_at), entregado, base, poolPct, Number(o.flete_pct ?? 0), 1);
  }

  // ── Devoluciones: una devolución aprobada descuenta su comisión ─────────
  // Se descuenta en el mes de la devolución (no se reabre el mes del pedido original, que puede estar
  // ya pagado). Como la devolución no está atada a un pedido, se usa el % vigente del cliente. Si el mes
  // ya estaba pagado, la diferencia aparece como ajuste a compensar (ver "extra" en /admin/comisiones).
  const { data: devoluciones, error: errDev } = await db.from("devoluciones")
    .select("cliente_id, fecha, monto_total")
    .in("estado", ["aprobada", "cerrada"])
    .gte("fecha", `${anio}-01-01`)
    .lte("fecha", `${anio}-12-31`)
    .limit(PAGINA);
  if (errDev) throw new Error(`No se pudieron leer las devoluciones para las comisiones: ${errDev.message}`);
  for (const d of (devoluciones ?? []) as any[]) {
    if (!(d.cliente_id in clienteVendedorMap)) continue;
    const monto = Number(d.monto_total);
    if (!(monto > 0)) continue;
    repartir(d.cliente_id, String(d.fecha).slice(0, 7), monto, monto, clientePoolPctMap[d.cliente_id] ?? comision_pct, 0, -1);
  }

  return { vendedores, comercializadoraId, agg };
}
