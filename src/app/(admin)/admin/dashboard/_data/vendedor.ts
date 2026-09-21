import { createAdminClient } from "@/lib/supabase/server";
import { ahoraAR } from "@/lib/fecha";
import { ACTIVE_STATUSES } from "../_lib/helpers";

export async function loadVendedorDashboard(user: { id: string }) {
  const adminClient = createAdminClient();
  const now        = ahoraAR();
  const mes        = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const mesNombre  = now.toLocaleDateString("es-AR", { month: "long" });
  const db         = adminClient;

  // Clientes asignados
  // profiles.role no es confiable (desincronizado en producción) — b2b_status
  // sí lo es, se setea únicamente en el alta como cliente B2B.
  const { data: clientesMios } = await db
    .from("profiles")
    .select("id, full_name, zona:delivery_zones!zona_id (name)")
    .eq("b2b_status", "activo")
    .eq("vendedor_id", user.id);

  const misIds = (clientesMios ?? []).map((c: any) => c.id);

  // Meta del mes + ventas + pedidos + últimos contactos (en paralelo)
  const [
    { data: metaData },
    { data: ventasData },
    { count: pedidosPendientes },
    { count: pedidosEnProd },
    { data: lastOrdersRaw },
    { data: ultimosContactos },
  ] = await Promise.all([
    db.from("sales_goals").select("objetivo").eq("vendedor_id", user.id).eq("mes", mes).maybeSingle(),

    misIds.length > 0
      ? db.from("orders").select("total")
          .in("customer_id", misIds).eq("channel", "b2b_mayorista")
          .in("status", ACTIVE_STATUSES).gte("created_at", monthStart)
      : Promise.resolve({ data: [] }),

    misIds.length > 0
      ? db.from("orders").select("*", { count: "exact", head: true })
          .in("customer_id", misIds).eq("channel", "b2b_mayorista").eq("status", "pending_payment")
      : Promise.resolve({ count: 0 }),

    misIds.length > 0
      ? db.from("orders").select("*", { count: "exact", head: true })
          .in("customer_id", misIds).eq("channel", "b2b_mayorista").in("status", ["aprobado", "enviado_prod"])
      : Promise.resolve({ count: 0 }),

    misIds.length > 0
      ? db.from("orders").select("customer_id, created_at")
          .in("customer_id", misIds).eq("channel", "b2b_mayorista")
          .neq("status", "cancelled").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    db.from("contact_logs")
      .select("tipo, notas, created_at, cliente:profiles!cliente_id(full_name)")
      .eq("vendedor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // Días de inactividad por cliente
  const lastOrderMap: Record<string, number> = {};
  for (const o of (lastOrdersRaw ?? []) as any[]) {
    if (!lastOrderMap[o.customer_id]) {
      lastOrderMap[o.customer_id] = Math.floor(
        (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  const clientesConDias = (clientesMios ?? [])
    .map((c: any) => ({ ...c, dias: lastOrderMap[c.id] ?? null }))
    .sort((a: any, b: any) => {
      if (a.dias === null && b.dias === null) return 0;
      if (a.dias === null) return -1;
      if (b.dias === null) return 1;
      return b.dias - a.dias;
    });

  const sinPedidos  = clientesConDias.filter((c: any) => c.dias === null);
  const inactivos30 = clientesConDias.filter((c: any) => c.dias !== null && c.dias > 30);
  const inactivos15 = clientesConDias.filter((c: any) => c.dias !== null && c.dias > 15 && c.dias <= 30);
  const activosCnt  = clientesConDias.filter((c: any) => c.dias !== null && c.dias <= 15).length;

  const ventasMes   = (ventasData ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
  const objetivo    = Number(metaData?.objetivo ?? 0);
  const pctMeta     = objetivo > 0 ? Math.min(Math.round((ventasMes / objetivo) * 100), 100) : null;
  const totalPend   = (pedidosPendientes ?? 0) + (pedidosEnProd ?? 0);
  const totalInact  = sinPedidos.length + inactivos30.length + inactivos15.length;

  return { now, mesNombre, misIds, pedidosPendientes, pedidosEnProd, ultimosContactos, sinPedidos, inactivos30, inactivos15, activosCnt, ventasMes, objetivo, pctMeta, totalPend, totalInact };
}
