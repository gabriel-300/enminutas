import { createAdminClient } from "@/lib/supabase/server";
import { ahoraAR } from "@/lib/fecha";
import { CANALES_FLUJO } from "@/lib/order-channels";

export async function loadProduccionDashboard() {
  const adminClient = createAdminClient();
  const db  = adminClient;
  const now = ahoraAR();

  const [
    { data: ordersRaw },
    { data: stockRaw },
  ] = await Promise.all([
    db.from("orders")
      .select("id, order_number, status, aprobado_at, lines:order_lines(quantity, product_snapshot)")
      .in("channel", CANALES_FLUJO)
      .in("status", ["aprobado", "enviado_prod"])
      .order("aprobado_at", { ascending: true }),

    db.from("products")
      .select("id, name, sku, stock_cajas, stock_minimo")
      .eq("is_active", true)
      .not("stock_minimo", "is", null),
  ]);

  const cola       = (ordersRaw ?? []).filter((o) => o.status === "aprobado");
  const preparando = (ordersRaw ?? []).filter((o) => o.status === "enviado_prod");
  const stockCritico = (stockRaw ?? []).filter(
    (p) => Number(p.stock_cajas ?? 0) <= Number(p.stock_minimo ?? 0)
  );


  return { now, cola, preparando, stockCritico };
}
