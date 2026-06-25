import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";

export const metadata: Metadata = { title: "Alertas — Admin" };
export const revalidate = 0;

type Alerta = {
  nivel: "critico" | "urgente" | "aviso";
  categoria: string;
  titulo: string;
  descripcion: string;
  href: string;
  count?: number;
};

const NIVEL_CFG = {
  critico: { icon: AlertCircle,   bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700",    label: "Crítico" },
  urgente: { icon: AlertTriangle, bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  label: "Urgente" },
  aviso:   { icon: Info,          bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",   label: "Aviso" },
};

export default async function AlertasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr       = hoy.toISOString().slice(0, 10);
  const en3diasStr   = new Date(hoy.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const en7diasStr   = new Date(hoy.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const hace3dias    = new Date(hoy.getTime() - 3 * 86400000).toISOString();

  const alertas: Alerta[] = [];

  // ── 1. LOTES VENCIDOS ───────────────────────────────────────────
  const { count: lotesVencidos } = await db
    .from("lotes")
    .select("id", { count: "exact", head: true })
    .eq("activo", true)
    .lt("fecha_vencimiento", hoyStr);

  if (lotesVencidos && lotesVencidos > 0) {
    alertas.push({
      nivel: "critico",
      categoria: "Lotes",
      titulo: `${lotesVencidos} lote${lotesVencidos > 1 ? "s" : ""} vencido${lotesVencidos > 1 ? "s" : ""}`,
      descripcion: "Hay stock vencido activo en el sistema. Revisá y dalo de baja.",
      href: "/admin/lotes",
      count: lotesVencidos,
    });
  }

  // ── 2. STOCK SIN STOCK ──────────────────────────────────────────
  // Productos activos donde la suma de lotes activos no vencidos = 0
  const { data: productosActivos } = await db
    .from("products")
    .select("id, name")
    .eq("is_active", true);

  const pIds = (productosActivos ?? []).map((p: any) => p.id);

  let sinStockCount = 0;
  let bajoMinimoCount = 0;
  if (pIds.length > 0) {
    const { data: lotesStock } = await db
      .from("lotes")
      .select("producto_id, cantidad_actual")
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${hoyStr}`)
      .in("producto_id", pIds);

    const stockPorProducto: Record<string, number> = {};
    for (const l of (lotesStock ?? []) as any[]) {
      stockPorProducto[l.producto_id] = (stockPorProducto[l.producto_id] ?? 0) + Number(l.cantidad_actual);
    }

    const { data: prodsConMinimo } = await db
      .from("products")
      .select("id, stock_minimo")
      .eq("is_active", true)
      .not("stock_minimo", "is", null);

    for (const p of pIds) {
      if ((stockPorProducto[p] ?? 0) === 0) sinStockCount++;
    }
    for (const p of (prodsConMinimo ?? []) as any[]) {
      const stock = stockPorProducto[p.id] ?? 0;
      if (stock > 0 && stock <= Number(p.stock_minimo)) bajoMinimoCount++;
    }
  }

  if (sinStockCount > 0) {
    alertas.push({
      nivel: "critico",
      categoria: "Stock",
      titulo: `${sinStockCount} producto${sinStockCount > 1 ? "s" : ""} sin stock`,
      descripcion: "Sin unidades disponibles en lotes activos.",
      href: "/admin/stock",
      count: sinStockCount,
    });
  }
  if (bajoMinimoCount > 0) {
    alertas.push({
      nivel: "urgente",
      categoria: "Stock",
      titulo: `${bajoMinimoCount} producto${bajoMinimoCount > 1 ? "s" : ""} bajo el mínimo`,
      descripcion: "El stock neto está por debajo del umbral configurado.",
      href: "/admin/stock",
      count: bajoMinimoCount,
    });
  }

  // ── 3. LOTES POR VENCER ─────────────────────────────────────────
  const { count: lotesPorVencer } = await db
    .from("lotes")
    .select("id", { count: "exact", head: true })
    .eq("activo", true)
    .gt("cantidad_actual", 0)
    .gte("fecha_vencimiento", hoyStr)
    .lte("fecha_vencimiento", en7diasStr);

  if (lotesPorVencer && lotesPorVencer > 0) {
    alertas.push({
      nivel: "urgente",
      categoria: "Lotes",
      titulo: `${lotesPorVencer} lote${lotesPorVencer > 1 ? "s" : ""} vence${lotesPorVencer > 1 ? "n" : ""} en 7 días`,
      descripcion: "Revisá y priorizá el despacho (FEFO).",
      href: "/admin/lotes",
      count: lotesPorVencer,
    });
  }

  // ── 4. CHEQUES URGENTES ─────────────────────────────────────────
  const { count: chequesUrgentes } = await db
    .from("cheques")
    .select("id", { count: "exact", head: true })
    .in("estado", ["en_cartera", "depositado"])
    .lte("fecha_acreditacion", en3diasStr);

  if (chequesUrgentes && chequesUrgentes > 0) {
    alertas.push({
      nivel: "urgente",
      categoria: "Cheques",
      titulo: `${chequesUrgentes} cheque${chequesUrgentes > 1 ? "s" : ""} vence${chequesUrgentes > 1 ? "n" : ""} en ≤3 días`,
      descripcion: "Depositá o acreditá los cheques próximos a vencer.",
      href: "/admin/cheques",
      count: chequesUrgentes,
    });
  }

  // ── 5. CLIENTES EN RIESGO DE CRÉDITO ────────────────────────────
  const { data: ccMovs } = await db
    .from("cc_movimientos")
    .select("cliente_id, monto");

  const { data: cuentas } = await db
    .from("b2b_accounts")
    .select("profile_id, credit_limit")
    .eq("status", "approved")
    .not("credit_limit", "is", null)
    .gt("credit_limit", 0);

  let clientesEnRiesgo = 0;
  const saldoMap: Record<string, number> = {};
  for (const m of (ccMovs ?? []) as any[]) {
    saldoMap[m.cliente_id] = (saldoMap[m.cliente_id] ?? 0) + Number(m.monto);
  }
  for (const c of (cuentas ?? []) as any[]) {
    const saldo = saldoMap[c.profile_id] ?? 0;
    if (saldo >= Number(c.credit_limit) * 0.9) clientesEnRiesgo++;
  }

  if (clientesEnRiesgo > 0) {
    alertas.push({
      nivel: "urgente",
      categoria: "Crédito",
      titulo: `${clientesEnRiesgo} cliente${clientesEnRiesgo > 1 ? "s" : ""} cerca del límite de crédito`,
      descripcion: "Saldo ≥90% del límite. Evaluá antes de aprobar nuevos pedidos.",
      href: "/admin/cuentas-corrientes",
      count: clientesEnRiesgo,
    });
  }

  // ── 6. PROSPECTOS CON CONTACTO VENCIDO ──────────────────────────
  const { count: prospectosVencidos } = await db
    .from("pipeline_prospectos")
    .select("id", { count: "exact", head: true })
    .not("estado", "in", '("ganado","perdido")')
    .not("fecha_proximo_contacto", "is", null)
    .lt("fecha_proximo_contacto", hoyStr);

  if (prospectosVencidos && prospectosVencidos > 0) {
    alertas.push({
      nivel: "aviso",
      categoria: "Pipeline",
      titulo: `${prospectosVencidos} prospecto${prospectosVencidos > 1 ? "s" : ""} con contacto vencido`,
      descripcion: "La fecha de próximo contacto ya pasó. Actualizá el pipeline.",
      href: "/admin/pipeline",
      count: prospectosVencidos,
    });
  }

  // ── 7. PEDIDOS DEMORADOS ─────────────────────────────────────────
  const { count: pedidosDemorados } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("status", ["despachado", "en_distribucion"])
    .lt("despachado_at", hace3dias);

  if (pedidosDemorados && pedidosDemorados > 0) {
    alertas.push({
      nivel: "aviso",
      categoria: "Distribución",
      titulo: `${pedidosDemorados} pedido${pedidosDemorados > 1 ? "s" : ""} en tránsito hace +3 días`,
      descripcion: "Pedidos despachados que aún no se registraron como entregados.",
      href: "/admin/distribucion",
      count: pedidosDemorados,
    });
  }

  // Ordenar: crítico → urgente → aviso
  const NIVEL_ORDEN = { critico: 0, urgente: 1, aviso: 2 };
  alertas.sort((a, b) => NIVEL_ORDEN[a.nivel] - NIVEL_ORDEN[b.nivel]);

  const criticos = alertas.filter(a => a.nivel === "critico").length;
  const urgentes = alertas.filter(a => a.nivel === "urgente").length;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Centro de alertas</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {alertas.length === 0
            ? "Todo en orden — sin alertas activas"
            : `${alertas.length} alerta${alertas.length > 1 ? "s" : ""} activa${alertas.length > 1 ? "s" : ""}${criticos > 0 ? ` · ${criticos} crítica${criticos > 1 ? "s" : ""}` : ""}${urgentes > 0 ? ` · ${urgentes} urgente${urgentes > 1 ? "s" : ""}` : ""}`}
        </p>
      </div>

      {alertas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <CheckCircle className="size-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-700">Todo en orden</p>
          <p className="text-xs text-neutral-400 mt-1">No hay alertas activas en este momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a, i) => {
            const cfg = NIVEL_CFG[a.nivel];
            const Icon = cfg.icon;
            return (
              <Link
                key={i}
                href={a.href}
                className={`flex items-start gap-4 p-4 rounded-2xl border ${cfg.bg} ${cfg.border} hover:opacity-90 transition-opacity`}
              >
                <Icon className={`size-5 shrink-0 mt-0.5 ${cfg.text}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-neutral-400">{a.categoria}</span>
                  </div>
                  <p className={`font-semibold text-sm ${cfg.text}`}>{a.titulo}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{a.descripcion}</p>
                </div>
                <span className="text-xs text-neutral-400 shrink-0 self-center">Ver →</span>
              </Link>
            );
          })}
        </div>
      )}

      <p className="text-xs text-neutral-400 text-center mt-6">
        Actualizado al cargar la página · Recargá para ver el estado actual
      </p>
    </div>
  );
}
