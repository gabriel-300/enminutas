import { fmt } from "@/lib/format";
import { hoyAR } from "@/lib/fecha";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { etiquetaComprobante } from "@/lib/proveedores";
import { ProveedorForm } from "../proveedor-form";
import { etiquetaCondicionIva } from "@/lib/proveedores-ficha";
import { FichaClient, type Comprobante, type OrdenPendiente, type PagoGrupo } from "./ficha-client";

export const metadata: Metadata = { title: "Proveedor — Admin" };
export const revalidate = 0;

export default async function ProveedorFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: prov } = await db.from("proveedores").select("*").eq("id", id).maybeSingle();
  if (!prov) notFound();

  const [{ data: recs }, { data: pagosRaw }, { data: ordenesRaw }] = await Promise.all([
    db.from("recepciones")
      .select("id, tipo, categoria_gasto, numero, fecha, total, neto, iva, percepciones, fecha_vencimiento_pago, genera_deuda, factura_id")
      .eq("proveedor_id", id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false }),
    db.from("pagos_proveedores")
      .select("id, recepcion_id, monto, fecha, metodo, referencia, notas, grupo_id, created_at, recepcion:recepciones!recepcion_id(tipo, categoria_gasto, numero)")
      .eq("proveedor_id", id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false }),
    db.from("ordenes_pago")
      .select("id, monto, fecha, metodo, referencia, notas, estado, aprobado_at")
      .eq("proveedor_id", id)
      .in("estado", ["borrador", "aprobada"])
      .order("creado_at", { ascending: false }),
  ]);

  const ordenes: OrdenPendiente[] = ((ordenesRaw ?? []) as any[]).map(o => ({
    id: o.id, monto: Number(o.monto), fecha: o.fecha, metodo: o.metodo, referencia: o.referencia,
    notas: o.notas, estado: o.estado, aprobadoAt: o.aprobado_at ?? null,
  }));
  const pagos = (pagosRaw ?? []) as any[];
  const pagadoPorRec: Record<string, number> = {};
  for (const p of pagos) if (p.recepcion_id) pagadoPorRec[p.recepcion_id] = (pagadoPorRec[p.recepcion_id] ?? 0) + Number(p.monto);

  const numeroPorId = new Map<string, string>(((recs ?? []) as any[]).map(r => [r.id, r.numero]));
  const comprobantes: Comprobante[] = ((recs ?? []) as any[]).map(r => {
    const total  = Number(r.total ?? 0);
    const pagado = pagadoPorRec[r.id] ?? 0;
    return {
      id:          r.id,
      tipo:        r.tipo,
      categoria:   r.categoria_gasto ?? null,
      numero:      r.numero,
      fecha:       r.fecha,
      vencimiento: r.fecha_vencimiento_pago ?? r.fecha,
      total,
      neto:         r.neto == null ? null : Number(r.neto),
      iva:          r.iva == null ? null : Number(r.iva),
      percepciones: r.percepciones == null ? null : Number(r.percepciones),
      pagado,
      saldo:       Math.max(0, total - pagado),
      generaDeuda: !!r.genera_deuda,
      facturaId:     r.factura_id ?? null,
      facturaNumero: r.factura_id ? (numeroPorId.get(r.factura_id) ?? null) : null,
    };
  });

  // Un pago repartido entre varias facturas aparece como una sola fila.
  const grupos = new Map<string, PagoGrupo>();
  for (const p of pagos) {
    const key = p.grupo_id ?? p.id;
    const g: PagoGrupo = grupos.get(key) ?? {
      grupoId: key, fecha: p.fecha, metodo: p.metodo, referencia: p.referencia, notas: p.notas, monto: 0, destinos: [],
    };
    g.monto += Number(p.monto);
    g.destinos.push(p.recepcion ? `${etiquetaComprobante(p.recepcion.tipo, p.recepcion.categoria_gasto)} ${p.recepcion.numero}` : "A cuenta");
    grupos.set(key, g);
  }
  const pagosGrupo = [...grupos.values()];

  const comprado = comprobantes.filter(c => c.generaDeuda).reduce((s, c) => s + c.total, 0);
  const pagado   = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldo    = comprado - pagado;
  const hoy      = hoyAR();
  const vencido  = Math.min(
    Math.max(saldo, 0),
    comprobantes.filter(c => c.generaDeuda && c.vencimiento < hoy).reduce((s, c) => s + c.saldo, 0),
  );

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-6 flex items-start gap-3 flex-wrap">
        <Link href="/admin/proveedores" className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors mt-0.5">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-48">
          <h1 className="text-xl font-semibold font-display text-neutral-900">{prov.nombre}</h1>
          <p className="text-sm text-neutral-600 mt-0.5">
            CUIT: {prov.cuit ?? "—"} · Plazo: {prov.condicion_pago_dias > 0 ? `${prov.condicion_pago_dias} días` : "contado"}
            {prov.contacto && ` · ${prov.contacto}`}{prov.telefono && ` · ${prov.telefono}`}{prov.email && ` · ${prov.email}`}
          </p>
          <p className="text-sm text-neutral-600">
            IVA: {etiquetaCondicionIva(prov.condicion_iva)} · CBU: {prov.cbu ?? "—"} · Alias: {prov.alias_bancario ?? "—"}
          </p>
          {prov.notas && <p className="text-xs text-neutral-600 mt-0.5">{prov.notas}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-600 mb-0.5">Saldo a pagar</p>
          <p className={`text-2xl font-bold tabular-nums ${saldo > 0.5 ? "text-danger" : "text-success"}`}>
            {saldo < -0.5 ? `${fmt(Math.abs(saldo))} a favor` : fmt(Math.max(0, saldo))}
          </p>
          {vencido > 0 && <p className="text-xs text-danger mt-0.5">Vencido: {fmt(vencido)}</p>}
        </div>
      </div>

      <div className="mb-6 flex">
        <ProveedorForm
          etiqueta="Editar datos"
          inicial={{
            id: prov.id, nombre: prov.nombre, cuit: prov.cuit, condicion_pago_dias: prov.condicion_pago_dias,
            contacto: prov.contacto, telefono: prov.telefono, email: prov.email, notas: prov.notas,
            condicion_iva: prov.condicion_iva ?? null, cbu: prov.cbu ?? null, alias_bancario: prov.alias_bancario ?? null,
          }}
        />
      </div>

      <FichaClient
        proveedorId={id}
        hoy={hoy}
        comprobantes={comprobantes}
        pagos={pagosGrupo}
        ordenes={ordenes}
      />
    </div>
  );
}
