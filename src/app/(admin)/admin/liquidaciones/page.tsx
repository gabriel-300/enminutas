import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LiquidacionesClient } from "./liquidaciones-client";

export const metadata: Metadata = { title: "Liquidaciones IDEIA — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default async function LiquidacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin");

  const db = createAdminClient() as any;

  const [{ data: liquidaciones }, { data: pendientes }] = await Promise.all([
    db.from("ideia_liquidations")
      .select("*")
      .order("period_start", { ascending: false }),

    db.from("orders")
      .select("id, total, ideia_commission_amount, created_at, order_number")
      .eq("status", "liquidado")
      .order("created_at", { ascending: false }),
  ]);

  const rows   = (liquidaciones ?? []) as any[];
  const pedidos = (pendientes   ?? []) as any[];

  // Pedidos liquidado que no están incluidos en ninguna liquidación existente
  // (simplificación: se muestran todos para referencia del admin)
  const totalPendienteGMV        = pedidos.reduce((s: number, o: any) => s + Number(o.total), 0);
  const totalPendienteComision   = pedidos.reduce((s: number, o: any) => s + Number(o.ideia_commission_amount), 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">
          Liquidaciones IDEIA
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Registro de períodos liquidados y comisiones pagadas a IDEIA.
        </p>
      </div>

      {/* Resumen pedidos con status "liquidado" */}
      {pedidos.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Pedidos liquidados", value: pedidos.length.toString(), sub: "total en la base" },
            { label: "GMV acumulado",       value: fmt(totalPendienteGMV),       sub: "todos los pedidos liquidados" },
            { label: "Comisión acumulada",  value: fmt(totalPendienteComision),  sub: "a pagar / ya pagada a IDEIA" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs text-neutral-400 mb-1">{label}</p>
              <p className="text-xl font-semibold font-display text-neutral-900">{value}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <LiquidacionesClient liquidaciones={rows} pedidos={pedidos} />
    </div>
  );
}
