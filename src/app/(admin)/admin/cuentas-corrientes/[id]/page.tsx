import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CcClient } from "./cc-client";

export const metadata: Metadata = { title: "Cuenta Corriente — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

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
  const { data: cuenta } = await db
    .from("b2b_accounts")
    .select("profile_id, business_name, cuit, iva_condition, credit_limit, domicilio_fiscal")
    .eq("profile_id", id)
    .single();

  if (!cuenta) notFound();

  const { data: perfil } = await db
    .from("profiles")
    .select("full_name, phone")
    .eq("id", id)
    .single();

  // Movimientos ordenados desc
  const { data: movData } = await db
    .from("cc_movimientos")
    .select("id, fecha, tipo, descripcion, monto, referencia")
    .eq("cliente_id", id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  const movimientos = (movData ?? []) as any[];
  const saldo  = movimientos.reduce((s, m) => s + Number(m.monto), 0);
  const limite = Number(cuenta.credit_limit ?? 0);
  const ag     = aging(movimientos);

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <Link href="/admin/cuentas-corrientes" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors mt-0.5">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold font-display text-neutral-900">{cuenta.business_name}</h1>
          <p className="text-sm text-neutral-400 mt-0.5">CUIT: {cuenta.cuit}</p>
        </div>
        {/* Saldo en header */}
        <div className="text-right">
          <p className="text-xs text-neutral-400 mb-0.5">Saldo actual</p>
          <p className={`text-2xl font-bold tabular-nums ${saldo > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {fmt(saldo)}
          </p>
          {limite > 0 && (
            <p className="text-xs text-neutral-400 mt-0.5">
              Límite: {fmt(limite)} ({Math.round((saldo / limite) * 100)}% usado)
            </p>
          )}
        </div>
      </div>

      {/* Aging */}
      {saldo > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Aging de deuda (cargos)</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: "0–30 días", val: ag.d30,    ok: true  },
              { label: "31–60 días", val: ag.d60,   ok: ag.d60 === 0  },
              { label: "61–90 días", val: ag.d90,   ok: ag.d90 === 0  },
              { label: "+90 días",   val: ag.d90mas, ok: ag.d90mas === 0 },
            ].map(b => (
              <div key={b.label} className={`rounded-xl p-3 ${b.val > 0 && !b.ok ? "bg-red-50" : "bg-neutral-50"}`}>
                <p className="text-xs text-neutral-400 mb-1">{b.label}</p>
                <p className={`text-sm font-bold tabular-nums ${b.val > 0 && !b.ok ? "text-red-600" : "text-neutral-700"}`}>
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
      />
    </div>
  );
}
