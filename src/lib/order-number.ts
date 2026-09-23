import type { createAdminClient } from "@/lib/supabase/server";

/**
 * Inserta un pedido B2B asignándole el próximo número "B2B-AAAA-NNNN". Reintenta si dos pedidos
 * chocan en el número (constraint UNIQUE).
 */
export async function insertarPedidoB2B(
  db: ReturnType<typeof createAdminClient>,
  baseInsert: Record<string, any>,
): Promise<{ id: string; orderNumber: string } | { error: string }> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: maxRow } = await db
      .from("orders")
      .select("order_number")
      .like("order_number", `B2B-${year}-%`)
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextSeq = 1;
    if ((maxRow as any)?.order_number) {
      const last = parseInt((maxRow as any).order_number.split("-").pop() ?? "0", 10);
      if (!isNaN(last)) nextSeq = last + 1;
    }
    const orderNumber = `B2B-${year}-${String(nextSeq).padStart(4, "0")}`;
    const { data: o, error } = await db
      .from("orders")
      .insert({ ...baseInsert, order_number: orderNumber } as any)
      .select("id")
      .single();
    if (!error && o) return { id: (o as any).id, orderNumber };
    if (error?.code !== "23505") return { error: error?.message ?? "Error al crear el pedido" };
    // 23505 también lo dispara el índice de reprogramación única: si no es el número, no se reintenta
    if (error.message?.includes("idx_orders_origen_activo")) return { error: "Este pedido ya tiene un faltante reprogramado" };
  }
  return { error: "No se pudo generar número de pedido único. Intentá de nuevo." };
}
