import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DevolucionActions } from "./devolucion-actions";

export const metadata: Metadata = { title: "Devolución — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const ESTADO_CFG = {
  solicitada: { label: "Solicitada", bg: "#eff6ff", text: "#2563eb" },
  aprobada:   { label: "Aprobada",   bg: "#fffbeb", text: "#b45309" },
  cerrada:    { label: "Cerrada",    bg: "#ecfdf5", text: "#059669" },
  rechazada:  { label: "Rechazada",  bg: "#fef2f2", text: "#dc2626" },
};

export default async function DevolucionDetailPage({
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

  const { data: dev } = await db
    .from("devoluciones")
    .select("*, profiles!devoluciones_cliente_id_fkey(full_name, phone)")
    .eq("id", id)
    .single();

  if (!dev) notFound();

  const { data: itemsData } = await db
    .from("devolucion_items")
    .select("*")
    .eq("devolucion_id", id);

  const items = (itemsData ?? []) as any[];
  const cfg   = ESTADO_CFG[dev.estado as keyof typeof ESTADO_CFG] ?? ESTADO_CFG.solicitada;

  // Si está aprobada, traer el movimiento en cuenta corriente
  let movCC: any = null;
  if (dev.cc_movimiento_id) {
    const { data: mov } = await db
      .from("cc_movimientos")
      .select("monto, fecha, descripcion")
      .eq("id", dev.cc_movimiento_id)
      .single();
    movCC = mov;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/devoluciones" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold font-display text-neutral-900">
                Devolución
              </h1>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: cfg.bg, color: cfg.text }}
              >
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-0.5">
              {new Date(dev.fecha + "T12:00:00").toLocaleDateString("es-AR")}
            </p>
          </div>
        </div>
        <DevolucionActions id={id} estado={dev.estado} />
      </div>

      <div className="space-y-4">
        {/* Cliente y motivo */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 grid sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Cliente</p>
            <p className="text-sm font-semibold text-neutral-900">{dev.profiles?.full_name ?? "—"}</p>
            {dev.profiles?.phone && <p className="text-xs text-neutral-500 mt-0.5">{dev.profiles.phone}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Motivo</p>
            <p className="text-sm text-neutral-900">{dev.motivo}</p>
            {dev.pedido_id && (
              <p className="text-xs text-neutral-500 mt-1">
                Pedido ref: <span className="font-mono">{dev.pedido_id}</span>
              </p>
            )}
            {dev.observaciones && (
              <p className="text-xs text-neutral-400 mt-1 italic">{dev.observaciones}</p>
            )}
          </div>
        </div>

        {/* Nota de crédito generada */}
        {movCC && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-0.5">Nota de crédito emitida</p>
              <p className="text-sm text-emerald-900">{movCC.descripcion}</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {new Date(movCC.fecha + "T12:00:00").toLocaleDateString("es-AR")}
              </p>
            </div>
            <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmt(Math.abs(Number(movCC.monto)))}</p>
          </div>
        )}

        {/* Ítems */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Descripción</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cant.</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Precio unit.</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {items.map((it: any) => (
                <tr key={it.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 text-neutral-900">{it.descripcion}</td>
                  <td className="px-5 py-3 text-right text-neutral-600 tabular-nums">{it.cantidad}</td>
                  <td className="px-5 py-3 text-right text-neutral-600 tabular-nums">{fmt(Number(it.precio_unitario))}</td>
                  <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(Number(it.subtotal))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-neutral-200">
              <tr>
                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-neutral-900">Total</td>
                <td className="px-5 py-3 text-right text-base font-bold text-neutral-900 tabular-nums">
                  {fmt(Number(dev.monto_total))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Flujo de estado */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Flujo</p>
          <div className="flex items-center gap-2 text-xs">
            {["solicitada", "aprobada", "cerrada"].map((e, i) => {
              const idx = ["solicitada", "aprobada", "cerrada"].indexOf(dev.estado);
              const active   = e === dev.estado;
              const done     = i < idx;
              const rejected = dev.estado === "rechazada";
              return (
                <div key={e} className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full font-medium ${
                    active   ? "bg-[#16233f] text-white" :
                    done     ? "bg-emerald-100 text-emerald-700" :
                    rejected && e === "solicitada" ? "bg-red-100 text-red-600" :
                    "bg-neutral-100 text-neutral-400"
                  }`}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </span>
                  {i < 2 && <span className="text-neutral-300">→</span>}
                </div>
              );
            })}
            {dev.estado === "rechazada" && (
              <span className="ml-2 px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600">Rechazada</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
