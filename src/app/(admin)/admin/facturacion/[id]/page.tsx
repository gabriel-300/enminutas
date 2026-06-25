import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { FacturaActions } from "./factura-actions";

export const metadata: Metadata = { title: "Factura — Admin" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const ESTADO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  borrador: { label: "Borrador", bg: "#f5f5f5", color: "#737373" },
  emitida:  { label: "Emitida",  bg: "#e8f0fb", color: "#2f5fd0" },
  cobrada:  { label: "Cobrada",  bg: "#ecfdf5", color: "#059669" },
  anulada:  { label: "Anulada",  bg: "#fef2f2", color: "#dc2626" },
};

const PAGO_LABEL: Record<string, string> = {
  contado: "Contado", "30_dias": "30 días", "60_dias": "60 días", "90_dias": "90 días", cheque: "Cheque diferido",
};

const COND_IVA_LABEL: Record<string, string> = {
  responsable_inscripto: "Responsable Inscripto",
  monotributista:        "Monotributista",
  consumidor_final:      "Consumidor Final",
  exento:                "Exento",
};

function numeroCmp(tipo: string, pv: number, numero: number | null) {
  if (!numero) return "BORRADOR";
  return `${tipo} ${String(pv).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

export default async function FacturaDetailPage({
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

  const { data: factura } = await db
    .from("facturas")
    .select("*")
    .eq("id", id)
    .single();

  if (!factura) notFound();

  const { data: itemsData } = await db
    .from("factura_items")
    .select("*")
    .eq("factura_id", id)
    .order("orden");

  const items = (itemsData ?? []) as any[];
  const f     = factura as any;
  const est   = ESTADO_CFG[f.estado] ?? ESTADO_CFG.borrador;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/facturacion" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold font-display text-neutral-900">
                {numeroCmp(f.tipo, f.punto_venta, f.numero)}
              </h1>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: est.bg, color: est.color }}
              >
                {est.label}
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-0.5 ml-0">
              {f.fecha_emision
                ? `Emitida el ${new Date(f.fecha_emision + "T12:00:00").toLocaleDateString("es-AR")}`
                : `Creada el ${new Date(f.created_at).toLocaleDateString("es-AR")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {f.estado !== "borrador" && (
            <Link
              href={`/admin/facturacion/${id}/pdf`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <FileText className="size-4" /> PDF
            </Link>
          )}
          <FacturaActions id={id} estado={f.estado} />
        </div>
      </div>

      {/* AFIP placeholder */}
      {f.estado === "emitida" && !f.cae && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          ⚠ Comprobante sin CAE — pendiente integración con ARCA/AFIP. No tiene validez fiscal.
        </div>
      )}

      <div className="space-y-5">
        {/* Emisor + Receptor */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Emisor</p>
            <p className="text-sm font-semibold text-neutral-900">En Minutas</p>
            <p className="text-xs text-neutral-500 mt-1">Punto de venta: {String(f.punto_venta).padStart(4, "0")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Receptor</p>
            <p className="text-sm font-semibold text-neutral-900">{f.razon_social}</p>
            <p className="text-xs text-neutral-500 mt-1">CUIT: {f.cuit}</p>
            <p className="text-xs text-neutral-500">{COND_IVA_LABEL[f.condicion_iva] ?? f.condicion_iva}</p>
            {f.domicilio_fiscal && <p className="text-xs text-neutral-500">{f.domicilio_fiscal}</p>}
          </div>
        </div>

        {/* Condiciones */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Tipo</p>
              <p className="font-medium text-neutral-900">Factura {f.tipo}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Condición de pago</p>
              <p className="font-medium text-neutral-900">{PAGO_LABEL[f.condicion_pago] ?? f.condicion_pago}</p>
            </div>
            {f.fecha_vencimiento && (
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Vence</p>
                <p className="font-medium text-neutral-900">
                  {new Date(f.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-AR")}
                </p>
              </div>
            )}
            {f.pedido_refs?.length > 0 && (
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Pedidos</p>
                <p className="font-medium text-neutral-900 text-xs">{f.pedido_refs.join(", ")}</p>
              </div>
            )}
          </div>
          {f.observaciones && (
            <p className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500">{f.observaciones}</p>
          )}
        </div>

        {/* Ítems */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Descripción</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cant.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Precio unit.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">IVA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {items.map((it: any) => (
                <tr key={it.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-900">{it.descripcion}</td>
                  <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">{it.cantidad} {it.unidad}</td>
                  <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">{fmt(Number(it.precio_unitario))}</td>
                  <td className="px-4 py-3 text-right text-neutral-500 tabular-nums">{it.alicuota_iva}%</td>
                  <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">{fmt(Number(it.subtotal))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(Number(it.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales IVA */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="max-w-xs ml-auto space-y-2 text-sm">
            {Number(f.neto_gravado_21) > 0 && <>
              <div className="flex justify-between text-neutral-600"><span>Neto gravado 21%</span><span className="tabular-nums">{fmt(Number(f.neto_gravado_21))}</span></div>
              <div className="flex justify-between text-neutral-600"><span>IVA 21%</span><span className="tabular-nums">{fmt(Number(f.iva_21))}</span></div>
            </>}
            {Number(f.neto_gravado_105) > 0 && <>
              <div className="flex justify-between text-neutral-600"><span>Neto gravado 10,5%</span><span className="tabular-nums">{fmt(Number(f.neto_gravado_105))}</span></div>
              <div className="flex justify-between text-neutral-600"><span>IVA 10,5%</span><span className="tabular-nums">{fmt(Number(f.iva_105))}</span></div>
            </>}
            {Number(f.neto_no_gravado) > 0 &&
              <div className="flex justify-between text-neutral-600"><span>No gravado</span><span className="tabular-nums">{fmt(Number(f.neto_no_gravado))}</span></div>
            }
            <div className="border-t border-neutral-200 pt-2 flex justify-between font-bold text-neutral-900 text-base">
              <span>TOTAL</span><span className="tabular-nums">{fmt(Number(f.total))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
