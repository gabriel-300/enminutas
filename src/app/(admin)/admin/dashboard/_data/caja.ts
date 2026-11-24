import { createAdminClient } from "@/lib/supabase/server";

export type CajaOrdenPendiente = {
  id:              string;
  proveedorId:     string;
  proveedorNombre: string;
  monto:           number;
  fecha:           string;
  metodo:          string;
};

// Dashboard de caja: órdenes de pago aprobadas de todos los proveedores.
// Mismo query shape que listarOrdenesAprobadas(), pero vive acá para no acoplar
// el dashboard a proveedores/actions.ts.
export async function loadCajaDashboard() {
  const db = createAdminClient() as any;
  const { data } = await db.from("ordenes_pago")
    .select("id, proveedor_id, monto, fecha, metodo, proveedor:proveedores!proveedor_id(nombre)")
    .eq("estado", "aprobada")
    .order("fecha", { ascending: true });

  const ordenes: CajaOrdenPendiente[] = ((data ?? []) as any[]).map(o => ({
    id:              o.id,
    proveedorId:     o.proveedor_id,
    proveedorNombre: o.proveedor?.nombre ?? "—",
    monto:           Number(o.monto),
    fecha:           o.fecha,
    metodo:          o.metodo,
  }));

  return { ordenes };
}
