import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, AlertCircle, ArrowRight, Info, CheckCircle } from "lucide-react";
import { PageHeader, StatusBadge, TONE_STYLES, type Tone } from "@/components/ui";

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

const NIVEL_CFG: Record<Alerta["nivel"], { icon: React.ElementType; tone: Tone; label: string }> = {
  critico: { icon: AlertCircle,   tone: "danger",  label: "Crítico" },
  urgente: { icon: AlertTriangle, tone: "warning", label: "Urgente" },
  aviso:   { icon: Info,          tone: "info",    label: "Aviso" },
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

  // ── 8. CLIENTES B2B PENDIENTES DE APROBACIÓN ─────────────────────
  const { count: clientesPendientes } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("b2b_status", "pendiente");

  if (clientesPendientes && clientesPendientes > 0) {
    alertas.push({
      nivel: "urgente",
      categoria: "Clientes B2B",
      titulo: `${clientesPendientes} cliente${clientesPendientes > 1 ? "s" : ""} pendiente${clientesPendientes > 1 ? "s" : ""} de aprobación`,
      descripcion: "Un vendedor cargó clientes nuevos que requieren aprobación del administrador.",
      href: "/admin/clientes-b2b",
      count: clientesPendientes,
    });
  }

  // ── 9. FALTANTES REPROGRAMADOS VENCIDOS ──────────────────────────
  // Pedidos creados con el faltante de una entrega parcial cuya fecha de compromiso ya pasó sin despacharse
  const { count: faltantesVencidos } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .not("origen_order_id", "is", null)
    .in("status", ["aprobado", "enviado_prod"])
    .lt("fecha_compromiso", hoyStr);

  if (faltantesVencidos && faltantesVencidos > 0) {
    alertas.push({
      nivel: "urgente",
      categoria: "Faltantes",
      titulo: `${faltantesVencidos} faltante${faltantesVencidos > 1 ? "s" : ""} reprogramado${faltantesVencidos > 1 ? "s" : ""} vencido${faltantesVencidos > 1 ? "s" : ""}`,
      descripcion: "Pedidos de faltante que pasaron su fecha de compromiso sin despacharse. Entregalos o cancelalos.",
      href: "/admin/pedidos",
      count: faltantesVencidos,
    });
  }

  // Ordenar: crítico → urgente → aviso
  const NIVEL_ORDEN = { critico: 0, urgente: 1, aviso: 2 };
  alertas.sort((a, b) => NIVEL_ORDEN[a.nivel] - NIVEL_ORDEN[b.nivel]);

  const criticos = alertas.filter(a => a.nivel === "critico").length;
  const urgentes = alertas.filter(a => a.nivel === "urgente").length;

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        className="mb-6"
        title="Centro de alertas"
        subtitle={
          alertas.length === 0
            ? "Todo en orden — sin alertas activas"
            : `${alertas.length} alerta${alertas.length > 1 ? "s" : ""} activa${alertas.length > 1 ? "s" : ""}${criticos > 0 ? ` · ${criticos} crítica${criticos > 1 ? "s" : ""}` : ""}${urgentes > 0 ? ` · ${urgentes} urgente${urgentes > 1 ? "s" : ""}` : ""}`
        }
      />

      {alertas.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center">
          <CheckCircle className="size-10 text-success-solid mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-900">Todo en orden</p>
          <p className="text-[13px] text-neutral-600 mt-1">No hay alertas activas en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] gap-3">
          {alertas.map((a, i) => {
            const cfg = NIVEL_CFG[a.nivel];
            const Icon = cfg.icon;
            const t = TONE_STYLES[cfg.tone];
            return (
              <Link
                key={i}
                href={a.href}
                className={`flex items-start gap-3.5 rounded-xl border bg-white px-[18px] py-4 shadow-sm transition-shadow hover:shadow-md ${t.border}`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] ${t.tile}`}>
                  <Icon className="size-[18px]" />
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>
                    <span className="text-xs text-neutral-600">{a.categoria}</span>
                  </div>
                  <p className="text-[15px] font-semibold text-neutral-900">{a.titulo}</p>
                  <p className="text-[13px] text-neutral-600">{a.descripcion}</p>
                </div>
                <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-n-btn bg-white px-2.5 text-[13px] font-medium text-neutral-800 shadow-btn">
                  Ver <ArrowRight className="size-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <p className="text-xs text-neutral-600 text-center mt-6">
        Actualizado al cargar la página · Recargá para ver el estado actual
      </p>
    </div>
  );
}
