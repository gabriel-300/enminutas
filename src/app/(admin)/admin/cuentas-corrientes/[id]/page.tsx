import { fmt } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CcClient } from "./cc-client";

export const metadata: Metadata = { title: "Cuenta Corriente — Admin" };
export const revalidate = 0;

function aging(movimientos: any[]) {
  const hoy  = new Date();
  const buckets = { d30: 0, d60: 0, d90: 0, d90mas: 0 };
  for (const m of movimientos) {
    if (Number(m.monto) <= 0) continue; // solo cargos para aging
    const dias = Math.floor((hoy.getTime() - new Date(m.fecha + "T12:00:00").getTime()) / 86400000);
    if (dias <= 30)       buckets.d30    += Number(m.monto);
    else if (dias <= 60)  buckets.d60    += Number(m.monto);
    else if (dias <= 90)  buckets.d90    += Number(m.monto);
    else                  buckets.d90mas += Number(m.monto);
  }
  return buckets;
}

export default async function CcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  // Datos del cliente
  // La cuenta B2B es opcional: el cliente puede tener movimientos sin fila en b2b_accounts.
  const { data: cuenta } = await db
    .from("b2b_accounts")
    .select("profile_id, business_name, cuit, credit_limit")
    .eq("profile_id", id)
    .maybeSingle();

  const { data: perfil } = await db
    .from("profiles")
    .select("full_name, document_number")
    .eq("id", id)
    .maybeSingle();

  if (!cuenta && !perfil) notFound();

  const nombre = cuenta?.business_name ?? perfil?.full_name ?? "Sin nombre";
  const cuit   = cuenta?.cuit ?? perfil?.document_number ?? "—";

  // Movimientos ordenados desc
  const { data: movData } = await db
    .from("cc_movimientos")
    .select("id, fecha, tipo, descripcion, monto, referencia, order_id, created_at")
    .eq("cliente_id", id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  // Pagos del circuito clientes-b2b: restan del saldo y se muestran como movimientos (solo lectura acá).
  const { data: pagosData } = await db
    .from("pagos")
    .select("id, fecha, monto, metodo, referencia, notas, order_id, created_at, order:orders!order_id(order_number)")
    .eq("cliente_id", id);

  const pagosComoMov = ((pagosData ?? []) as any[]).map((p: any) => ({
    id:          `pago-${p.id}`,
    fecha:       p.fecha,
    tipo:        "pago",
    descripcion: `Pago registrado${p.order?.order_number ? ` — Pedido ${p.order.order_number}` : ""} (${p.metodo})${p.notas ? ` · ${p.notas}` : ""}`,
    monto:       -Math.abs(Number(p.monto)),
    referencia:  p.referencia ?? null,
    order_id:    p.order_id ?? null,
    created_at:  p.created_at,
    soloLectura: true,
  }));

  const movimientos = [...((movData ?? []) as any[]), ...pagosComoMov].sort((a, b) =>
    a.fecha === b.fecha
      ? String(b.created_at).localeCompare(String(a.created_at))
      : String(b.fecha).localeCompare(String(a.fecha))
  );
  const saldo  = movimientos.reduce((s, m) => s + Number(m.monto), 0);
  const limite = Number(cuenta?.credit_limit ?? 0);
  const ag     = aging(movimientos);

  // Pedidos en CC con saldo pendiente
  const { data: pedidosCC } = await db
    .from("orders")
    .select("id, order_number, total, created_at, status")
    .eq("customer_id", id)
    .eq("payment_method", "cuenta_corriente")
    .not("status", "in", '("cancelled","liquidado","pending_payment")')
    .order("created_at", { ascending: true });

  // Pagos ya registrados por pedido
  const pedidoIds = (pedidosCC ?? []).map((p: any) => p.id);
  let pagosPorPedido: Record<string, number> = {};
  if (pedidoIds.length > 0) {
    for (const m of movimientos) {
      if (m.order_id && pedidoIds.includes(m.order_id) && (m.tipo === "pago" || m.tipo === "nota_credito")) {
        pagosPorPedido[m.order_id] = (pagosPorPedido[m.order_id] ?? 0) + Math.abs(Number(m.monto));
      }
    }
  }

  const pedidosPendientes = (pedidosCC ?? [])
    .map((p: any) => ({
      id:           p.id,
      order_number: p.order_number,
      total:        Number(p.total),
      pagado:       pagosPorPedido[p.id] ?? 0,
      saldo:        Number(p.total) - (pagosPorPedido[p.id] ?? 0),
      created_at:   p.created_at,
      status:       p.status,
    }))
    .filter((p: { saldo: number }) => p.saldo > 0.5);

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <Link href="/admin/cuentas-corrientes" className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors mt-0.5">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold font-display text-neutral-900">{nombre}</h1>
          <p className="text-sm text-neutral-600 mt-0.5">CUIT: {cuit}</p>
        </div>
        {/* Saldo en header */}
        <div className="text-right">
          <p className="text-xs text-neutral-600 mb-0.5">Saldo actual</p>
          <p className={`text-2xl font-bold tabular-nums ${saldo > 0 ? "text-danger" : "text-success"}`}>
            {fmt(saldo)}
          </p>
          {limite > 0 && (
            <p className="text-xs text-neutral-600 mt-0.5">
              Límite: {fmt(limite)} ({Math.round((saldo / limite) * 100)}% usado)
            </p>
          )}
        </div>
      </div>

      {/* Aging */}
      {saldo > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 mb-6">
          <p className="text-xs font-semibold text-neutral-600 mb-3">Aging de deuda (cargos)</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: "0–30 días", val: ag.d30,    ok: true  },
              { label: "31–60 días", val: ag.d60,   ok: ag.d60 === 0  },
              { label: "61–90 días", val: ag.d90,   ok: ag.d90 === 0  },
              { label: "+90 días",   val: ag.d90mas, ok: ag.d90mas === 0 },
            ].map(b => (
              <div key={b.label} className={`rounded-xl p-3 ${b.val > 0 && !b.ok ? "bg-danger-bg" : "bg-neutral-50"}`}>
                <p className="text-xs text-neutral-600 mb-1">{b.label}</p>
                <p className={`text-sm font-bold tabular-nums ${b.val > 0 && !b.ok ? "text-danger" : "text-neutral-700"}`}>
                  {fmt(b.val)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <CcClient
        clienteId={id}
        movimientos={movimientos}
        saldo={saldo}
        limite={limite}
        pedidosPendientes={pedidosPendientes}
      />
    </div>
  );
}
