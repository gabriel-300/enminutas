import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StockClient } from "./stock-client";

export const metadata: Metadata = { title: "Stock — Admin" };
export const revalidate = 0;

// Pedidos en curso (no entregados, no cancelados) — consumen stock comprometido
const COMMITTED_STATUSES = [
  "aprobado", "enviado_prod", "despachado", "en_distribucion", "entrega_parcial",
];

export default async function StockPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!["admin", "produccion"].includes(user.app_metadata?.role)) redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  // 1. Productos activos con linea
  const { data: productsRaw } = await db
    .from("products")
    .select("id, name, unit_label, linea_id, stock_minimo, linea:lineas_producto!linea_id(nombre)")
    .eq("is_active", true)
    .order("name");

  const productos = (productsRaw ?? []) as any[];
  const productoIds = productos.map((p: any) => p.id);

  // 2. Stock disponible en lotes (activos, no vencidos)
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: lotesRaw } = await db
    .from("lotes")
    .select("producto_id, cantidad_actual")
    .eq("activo", true)
    .gt("cantidad_actual", 0)
    .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${hoy}`)
    .in("producto_id", productoIds.length > 0 ? productoIds : ["00000000-0000-0000-0000-000000000000"]);

  // Agrupar disponible por producto
  const disponibleMap: Record<string, number> = {};
  for (const l of (lotesRaw ?? []) as any[]) {
    disponibleMap[l.producto_id] = (disponibleMap[l.producto_id] ?? 0) + Number(l.cantidad_actual);
  }

  // 3. Stock comprometido: order_lines de pedidos en curso
  const { data: linesRaw } = await db
    .from("order_lines")
    .select("product_id, quantity, orders!inner(status)")
    .in("orders.status", COMMITTED_STATUSES)
    .in("product_id", productoIds.length > 0 ? productoIds : ["00000000-0000-0000-0000-000000000000"]);

  const comprometidoMap: Record<string, number> = {};
  for (const l of (linesRaw ?? []) as any[]) {
    comprometidoMap[l.product_id] = (comprometidoMap[l.product_id] ?? 0) + Number(l.quantity);
  }

  // 4. Construir filas
  const filas = productos.map((p: any) => {
    const disponible   = disponibleMap[p.id]   ?? 0;
    const comprometido = comprometidoMap[p.id] ?? 0;
    const neto         = disponible - comprometido;
    const minimo       = p.stock_minimo !== null ? Number(p.stock_minimo) : null;
    const alerta: "sin_stock" | "bajo" | "ok" =
      disponible === 0    ? "sin_stock" :
      minimo !== null && neto <= minimo ? "bajo" :
      "ok";
    return {
      id:           p.id,
      nombre:       p.name,
      unit_label:   p.unit_label ?? "",
      linea:        (p.linea as any)?.nombre ?? "—",
      disponible,
      comprometido,
      neto,
      minimo,
      alerta,
    };
  });

  // KPIs
  const sinStock  = filas.filter(f => f.alerta === "sin_stock").length;
  const bajoStock = filas.filter(f => f.alerta === "bajo").length;
  const conStock  = filas.filter(f => f.alerta === "ok").length;
  const lineas    = [...new Set(filas.map(f => f.linea))].sort();

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900">Control de stock</h1>
          <p className="text-sm text-neutral-400 mt-1">Disponible en lotes · comprometido en pedidos activos</p>
        </div>
        <a
          href="/admin/lotes"
          className="text-sm font-medium text-[#16233f] hover:underline"
        >
          Gestionar lotes →
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`rounded-2xl p-5 border ${sinStock > 0 ? "bg-red-50 border-red-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Sin stock</p>
          <p className={`text-2xl font-bold ${sinStock > 0 ? "text-red-700" : "text-neutral-900"}`}>{sinStock}</p>
          <p className="text-xs text-neutral-400 mt-0.5">productos en cero</p>
        </div>
        <div className={`rounded-2xl p-5 border ${bajoStock > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Stock bajo</p>
          <p className={`text-2xl font-bold ${bajoStock > 0 ? "text-amber-700" : "text-neutral-900"}`}>{bajoStock}</p>
          <p className="text-xs text-neutral-400 mt-0.5">bajo el mínimo</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Con stock</p>
          <p className="text-2xl font-bold text-emerald-700">{conStock}</p>
          <p className="text-xs text-neutral-400 mt-0.5">productos ok</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Comprometido</p>
          <p className="text-2xl font-bold text-neutral-900">
            {filas.reduce((s, f) => s + f.comprometido, 0).toLocaleString("es-AR")}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">unidades en pedidos</p>
        </div>
      </div>

      <StockClient filas={filas} lineas={lineas} />
    </div>
  );
}
