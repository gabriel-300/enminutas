import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MetaVendedorCard } from "@/components/admin/meta-vendedor-form";
import { PreventistaClientesList } from "@/components/admin/preventista-clientes-list";

export const metadata: Metadata = { title: "Preventista — Admin En Minutas" };
export const revalidate = 0;

const ACTIVE_STATUSES = ["aprobado", "enviado_prod", "despachado", "delivered", "liquidado"];

function diasDesde(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function PreventistaPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role      = user.app_metadata?.role as string | undefined;
  const esAdmin   = role === "admin";
  const esVendedor = role === "vendedor";

  // Mes actual
  const now = new Date();
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const desdeMs = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const hastaMs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // ── Parámetros globales para cálculo de comisión ────────────────────────
  const { data: rawParams } = await adminClient
    .from("parametros_globales")
    .select("clave, valor");
  const paramVal = (key: string, def: number) =>
    ((rawParams ?? []) as any[]).find((p: any) => p.clave === key)?.valor ?? def;
  const ivaPct      = paramVal("iva_pct",      0.21);
  const comisionPct = paramVal("comision_pct", 0.15);
  const divisorPrecio = 1 + ivaPct + comisionPct;

  // ── Metas de venta ───────────────────────────────────────────────────────
  // Lista de vendedores del sistema
  const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const vendedores = (allUsers ?? [])
    .filter((u: any) => u.app_metadata?.role === "vendedor")
    .map((u: any) => ({
      id:     u.id,
      nombre: u.user_metadata?.full_name ?? u.email ?? u.id,
      email:  u.email,
    }));

  // Comisión asignada al vendedor logueado (si aplica)
  let comisionPropiaConfig: number | null = null;
  if (esVendedor) {
    const { data: perfil } = await adminClient
      .from("profiles")
      .select("comision_preventista_pct")
      .eq("id", user.id)
      .single();
    comisionPropiaConfig = (perfil as any)?.comision_preventista_pct ?? null;
  }

  // Vendedores a mostrar en metas: todos (admin) o solo yo (vendedor)
  const vendedoresMeta = esAdmin ? vendedores
    : vendedores.filter((v: any) => v.id === user.id);

  // Metas del mes
  const vendedorIds = vendedoresMeta.map((v: any) => v.id);
  let metaMap: Record<string, number> = {};
  if (vendedorIds.length > 0) {
    const { data: rawGoals } = await adminClient
      .from("sales_goals")
      .select("vendedor_id, objetivo")
      .in("vendedor_id", vendedorIds)
      .eq("mes", mes);
    for (const g of (rawGoals ?? []) as any[]) {
      metaMap[g.vendedor_id] = Number(g.objetivo);
    }
  }

  // Ventas del mes por vendedor: pedidos de clientes asignados a ese vendedor
  // Primero: obtener todos los clientes con vendedor asignado
  const { data: perfilesVendedor } = await adminClient
    .from("profiles")
    .select("id, vendedor_id")
    .in("vendedor_id", vendedorIds.length > 0 ? vendedorIds : ["__none__"]);

  // Agrupar cliente_id → vendedor_id
  const clienteVendedorMap: Record<string, string> = {};
  for (const p of (perfilesVendedor ?? []) as any[]) {
    if (p.vendedor_id) clienteVendedorMap[p.id] = p.vendedor_id;
  }

  const clienteIds = Object.keys(clienteVendedorMap);
  let ventasMap: Record<string, number> = {};

  if (clienteIds.length > 0) {
    const { data: rawOrders } = await adminClient
      .from("orders")
      .select("customer_id, total")
      .in("customer_id", clienteIds)
      .in("status", ACTIVE_STATUSES)
      .gte("created_at", desdeMs)
      .lte("created_at", hastaMs);

    for (const o of (rawOrders ?? []) as any[]) {
      const vid = clienteVendedorMap[o.customer_id];
      if (vid) ventasMap[vid] = (ventasMap[vid] ?? 0) + Number(o.total);
    }
  }

  // ── Clientes activos ─────────────────────────────────────────────────────
  let clientesQuery = adminClient
    .from("profiles")
    .select("id, full_name, canal, phone, vendedor_id, zona:delivery_zones!zona_id (name)")
    .eq("role", "customer_b2b")
    .eq("b2b_status", "activo")
    .order("full_name");

  if (esVendedor) clientesQuery = clientesQuery.eq("vendedor_id", user.id);

  const { data: rawClientes } = await clientesQuery;
  const clientes = (rawClientes ?? []) as any[];
  const clienteIds2: string[] = clientes.map((c: any) => c.id);

  // Último pedido por cliente
  let lastOrderMap: Record<string, { id: string; order_number: string; total: number; created_at: string }> = {};
  if (clienteIds2.length > 0) {
    const { data: rawOrders } = await adminClient
      .from("orders")
      .select("id, customer_id, order_number, total, created_at")
      .in("customer_id", clienteIds2)
      .order("created_at", { ascending: false });

    for (const o of (rawOrders ?? []) as any[]) {
      if (!lastOrderMap[o.customer_id]) {
        lastOrderMap[o.customer_id] = {
          id: o.id, order_number: o.order_number,
          total: Number(o.total), created_at: o.created_at,
        };
      }
    }
  }

  // Historial de contactos y notas por cliente
  type ContactLog = { tipo: string; notas: string | null; created_at: string };
  let historialMap: Record<string, ContactLog[]> = {};
  let notasMap: Record<string, string | null> = {};

  if (clienteIds2.length > 0) {
    const [{ data: rawContacts }, { data: rawNotas }] = await Promise.all([
      adminClient
        .from("contact_logs")
        .select("cliente_id, tipo, notas, created_at")
        .in("cliente_id", clienteIds2)
        .order("created_at", { ascending: false })
        .limit(500),
      adminClient
        .from("profiles")
        .select("id, notas_internas")
        .in("id", clienteIds2),
    ]);

    for (const c of (rawContacts ?? []) as any[]) {
      if (!historialMap[c.cliente_id]) historialMap[c.cliente_id] = [];
      historialMap[c.cliente_id].push({ tipo: c.tipo, notas: c.notas ?? null, created_at: c.created_at });
    }
    for (const p of (rawNotas ?? []) as any[]) {
      notasMap[p.id] = p.notas_internas ?? null;
    }
  }

  // Ordenar por más inactivos primero
  const clientesConDias = clientes.map((c: any) => {
    const lastOrder = lastOrderMap[c.id] ?? null;
    return {
      ...c,
      lastOrder,
      dias:               diasDesde(lastOrder?.created_at ?? null),
      historialContactos: historialMap[c.id] ?? [],
      notasInternas:      notasMap[c.id] ?? null,
    };
  }).sort((a: any, b: any) => {
    if (a.dias === null && b.dias === null) return 0;
    if (a.dias === null) return -1;
    if (b.dias === null) return 1;
    return b.dias - a.dias;
  });

  // Ventas del mes del propio vendedor (para su card de comisión)
  const ventasPropias = esVendedor ? (ventasMap[user.id] ?? 0) : 0;
  const comisionPropiaAmt = (comisionPropiaConfig != null && ventasPropias > 0)
    ? Math.round(ventasPropias * comisionPropiaConfig / divisorPrecio)
    : null;

  const fmtARS = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

  const mesNombreDisplay = new Date(mes + "-01").toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-5 md:space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Preventista</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {esVendedor ? "Tus clientes asignados" : "Todos los clientes B2B activos"} — ordenados por inactividad
          </p>
        </div>
        <Link
          href="/admin/preventista/lista-precios"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Lista de precios
        </Link>
      </div>

      {/* Card de comisión propia — solo para vendedor */}
      {esVendedor && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3 capitalize">
            Tu comisión · {mesNombreDisplay}
          </p>
          {comisionPropiaConfig == null ? (
            <p className="text-sm text-neutral-400">Aún no tenés comisión asignada. Consultá con el administrador.</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Ventas del mes</p>
                <p className="text-xl font-semibold font-display tabular-nums text-neutral-900">
                  {fmtARS(ventasPropias)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Tu % de comisión</p>
                <p className="text-xl font-semibold font-display tabular-nums text-info">
                  {Math.round(comisionPropiaConfig * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Tu comisión del mes</p>
                <p className={`text-xl font-semibold font-display tabular-nums ${comisionPropiaAmt ? "text-tierra-700" : "text-neutral-400"}`}>
                  {comisionPropiaAmt != null ? fmtARS(comisionPropiaAmt) : "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metas del mes */}
      {vendedoresMeta.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            Metas del mes · {new Date(mes + "-01").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>
          <div className={`grid gap-3 md:gap-4 ${vendedoresMeta.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-1 sm:grid-cols-2"}`}>
            {vendedoresMeta.map((v: any) => (
              <MetaVendedorCard
                key={v.id}
                vendedorId={v.id}
                vendedorNombre={v.nombre}
                mes={mes}
                ventasMes={ventasMap[v.id] ?? 0}
                objetivo={metaMap[v.id] ?? 0}
                esAdmin={esAdmin}
              />
            ))}
          </div>
        </div>
      )}

      <PreventistaClientesList clientes={clientesConDias} esVendedor={esVendedor} />
    </div>
  );
}
