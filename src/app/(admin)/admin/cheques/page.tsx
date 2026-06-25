import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChequesClient } from "./cheques-client";

export const metadata: Metadata = { title: "Cheques — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const TABS = ["todos", "en_cartera", "depositado", "acreditado", "rechazado"] as const;
const TAB_LABEL: Record<string, string> = {
  todos: "Todos", en_cartera: "En cartera", depositado: "Depositado",
  acreditado: "Acreditado", rechazado: "Rechazado",
};

export default async function ChequesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const filtro = estado ?? "todos";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  let query = db
    .from("cheques")
    .select("*, profiles(full_name)")
    .order("fecha_acreditacion", { ascending: true });

  if (filtro !== "todos") query = query.eq("estado", filtro);

  const { data } = await query;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cheques = ((data ?? []) as any[]).map((ch: any) => {
    const acred = new Date(ch.fecha_acreditacion + "T00:00:00");
    const dias  = Math.floor((acred.getTime() - hoy.getTime()) / 86400000);
    return {
      id:                  ch.id,
      cliente_id:          ch.cliente_id,
      cliente_nombre:      ch.profiles?.full_name ?? "—",
      numero_cheque:       ch.numero_cheque,
      banco:               ch.banco,
      librador:            ch.librador,
      monto:               Number(ch.monto),
      fecha_emision:       ch.fecha_emision,
      fecha_acreditacion:  ch.fecha_acreditacion,
      estado:              ch.estado,
      dias_para_acreditar: dias,
    };
  });

  // KPIs globales (todos los cheques, no filtrados)
  const { data: todos } = await db
    .from("cheques")
    .select("estado, monto, fecha_acreditacion");

  const todosArr = (todos ?? []) as any[];
  const enCartera    = todosArr.filter(c => c.estado === "en_cartera" || c.estado === "depositado");
  const montoCartera = enCartera.reduce((s, c) => s + Number(c.monto), 0);
  const vencenHoy7   = enCartera.filter(c => {
    const d = Math.floor((new Date(c.fecha_acreditacion + "T00:00:00").getTime() - hoy.getTime()) / 86400000);
    return d >= 0 && d <= 7;
  }).length;
  const rechazados = todosArr.filter(c => {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return c.estado === "rechazado" && new Date(c.fecha_acreditacion) >= mes;
  }).length;

  const { data: perfiles } = await db
    .from("profiles")
    .select("id, full_name")
    .not("full_name", "is", null)
    .order("full_name");

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Cheques diferidos</h1>
        <p className="text-sm text-neutral-400 mt-1">Cartera de cheques recibidos de clientes B2B</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">En cartera</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums">{fmt(montoCartera)}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{enCartera.length} cheque{enCartera.length !== 1 ? "s" : ""}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${vencenHoy7 > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Acreditan en 7 días</p>
          <p className={`text-2xl font-bold ${vencenHoy7 > 0 ? "text-amber-700" : "text-neutral-900"}`}>{vencenHoy7}</p>
          <p className="text-xs text-neutral-400 mt-0.5">cheques próximos</p>
        </div>
        <div className={`rounded-2xl border p-5 ${rechazados > 0 ? "bg-red-50 border-red-200" : "bg-white border-neutral-200"}`}>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Rechazados</p>
          <p className={`text-2xl font-bold ${rechazados > 0 ? "text-red-600" : "text-neutral-900"}`}>{rechazados}</p>
          <p className="text-xs text-neutral-400 mt-0.5">este mes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TABS.map(t => (
          <Link
            key={t}
            href={t === "todos" ? "/admin/cheques" : `/admin/cheques?estado=${t}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filtro === t
                ? "bg-[#16233f] text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {TAB_LABEL[t]}
          </Link>
        ))}
      </div>

      <ChequesClient
        cheques={cheques}
        clientes={(perfiles ?? []) as any[]}
        filtro={filtro}
      />
    </div>
  );
}
