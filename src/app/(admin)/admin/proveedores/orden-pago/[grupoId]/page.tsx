import { fmt2 as fmt } from "@/lib/format";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { etiquetaComprobante } from "@/lib/proveedores";
import { etiquetaCondicionIva } from "@/lib/proveedores-ficha";
import { PrintButton } from "./print-button";

export const revalidate = 0;

const fmtFecha = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

const METODOS: Record<string, string> = {
  transferencia: "Transferencia bancaria",
  efectivo:      "Efectivo",
  cheque:        "Cheque",
  otro:          "Otro",
};

// Orden de pago imprimible. `grupoId` es el grupo del pago (o el id si el pago no tiene grupo).
export default async function OrdenPagoPage({ params }: { params: Promise<{ grupoId: string }> }) {
  const { grupoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;
  const provCols = "id, nombre, cuit, contacto, telefono, email, condicion_iva, cbu, alias_bancario";
  const cols = `id, monto, fecha, metodo, referencia, notas, proveedor_id, created_at,
    proveedor:proveedores!proveedor_id(${provCols}),
    recepcion:recepciones!recepcion_id(tipo, categoria_gasto, numero, fecha, total)`;

  // Una orden todavía no pagada vive en ordenes_pago; recién pagada pasa a pagos_proveedores (mismo id).
  const { data: orden } = await db.from("ordenes_pago")
    .select(`id, monto, fecha, metodo, referencia, notas, estado, aprobado_at, proveedor:proveedores!proveedor_id(${provCols})`)
    .eq("id", grupoId).maybeSingle();

  let pagos: any[] | null = null;
  if (orden && orden.estado !== "pagada") {
    pagos = [{
      id: orden.id, monto: orden.monto, fecha: orden.fecha, metodo: orden.metodo, referencia: orden.referencia,
      notas: orden.notas, proveedor: orden.proveedor, recepcion: null,
    }];
  } else {
    const r1 = await db.from("pagos_proveedores").select(cols).eq("grupo_id", grupoId).order("created_at");
    pagos = r1.data;
    if (!pagos?.length) {
      const { data: uno } = await db.from("pagos_proveedores").select(cols).eq("id", grupoId).limit(1);
      pagos = uno;
    }
  }
  if (!pagos?.length) notFound();
  const pendiente = orden && orden.estado !== "pagada" ? (orden.estado as "borrador" | "aprobada") : null;

  const prov  = pagos[0].proveedor;
  const total = pagos.reduce((s: number, p: any) => s + Number(p.monto), 0);
  const nro   = grupoId.slice(0, 8).toUpperCase();

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } body { margin: 0; } }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f3; margin: 0; }
        .page { background: #fff; max-width: 680px; margin: 0 auto; padding: 56px 56px 80px; min-height: 100vh; }
        @media (max-width: 600px) { .page { padding: 32px 24px 56px; } }
      `}</style>

      <div className="no-print fixed top-0 left-0 right-0 bg-neutral-900 text-white px-6 py-3 flex items-center justify-between z-50 gap-4 print:hidden">
        <span className="text-sm text-neutral-300">Orden de pago #{nro} — {prov?.nombre}</span>
        <div className="flex gap-3">
          <a href={`/admin/proveedores/${prov?.id}`} className="text-sm text-neutral-400 hover:text-white transition-colors">
            ← Volver al proveedor
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="page" style={{ marginTop: "52px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", paddingBottom: "24px", borderBottom: "2px solid #1a1a18" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a18" }}>Cooperativa de Trabajo Il Pane Nostro Ltda.</div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>CUIT: 30-71858060-5</div>
            <div style={{ fontSize: "12px", color: "#555" }}>Ruta 12 — Garupa, Misiones</div>
            <div style={{ fontSize: "12px", color: "#555" }}>Responsable Inscripto</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "4px" }}>Orden de pago</div>
            <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "monospace", color: "#1a1a18" }}>#{nro}</div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{fmtFecha(pagos[0].fecha)}</div>
          </div>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", marginBottom: "12px" }}>Pagado a</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a18", marginBottom: "6px" }}>{prov?.nombre ?? "Proveedor"}</div>
          {prov?.cuit && <div style={{ fontSize: "13px", color: "#555" }}>CUIT: {prov.cuit}</div>}
          {prov?.contacto && <div style={{ fontSize: "13px", color: "#555" }}>{prov.contacto}</div>}
          {prov?.condicion_iva && <div style={{ fontSize: "13px", color: "#555" }}>IVA: {etiquetaCondicionIva(prov.condicion_iva)}</div>}
          {prov?.cbu && <div style={{ fontSize: "13px", color: "#555", fontFamily: "monospace" }}>CBU: {prov.cbu}</div>}
          {prov?.alias_bancario && <div style={{ fontSize: "13px", color: "#555" }}>Alias: {prov.alias_bancario}</div>}
        </div>

        {pendiente && (
          <div style={{ border: "2px dashed #b45309", color: "#b45309", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", fontSize: "13px", fontWeight: 600 }}>
            {pendiente === "borrador"
              ? "BORRADOR — pendiente de aprobación. Todavía no se pagó."
              : "APROBADA — pendiente de pago. Todavía no se registró el pago."}
          </div>
        )}

        <div style={{ border: "1px solid #e5e5e3", borderRadius: "8px", overflow: "hidden", marginBottom: "32px" }}>
          <div style={{ background: "#f7f6f4", padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "16px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999" }}>
            <span>Concepto</span>
            <span>Método</span>
            <span style={{ textAlign: "right" }}>Importe</span>
          </div>
          {pagos.map((p: any, i: number) => (
            <div key={p.id} style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "16px", alignItems: "center", borderTop: i === 0 ? "1px solid #e5e5e3" : "1px solid #f0f0ee" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a18" }}>
                  {p.recepcion
                    ? `Pago — ${etiquetaComprobante(p.recepcion.tipo, p.recepcion.categoria_gasto)} ${p.recepcion.numero}`
                    : "Pago a cuenta"}
                </div>
                {p.referencia && <div style={{ fontSize: "12px", color: "#888", marginTop: "3px", fontFamily: "monospace" }}>Ref: {p.referencia}</div>}
                {p.notas && <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{p.notas}</div>}
              </div>
              <div style={{ fontSize: "13px", color: "#555", whiteSpace: "nowrap" }}>{METODOS[p.metodo] ?? p.metodo}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a18", fontVariantNumeric: "tabular-nums", textAlign: "right", whiteSpace: "nowrap" }}>
                {fmt(Number(p.monto))}
              </div>
            </div>
          ))}
          <div style={{ background: "#1a1a18", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>{pendiente ? "Total a pagar" : "Total pagado"}</span>
            <span style={{ fontSize: "22px", fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginTop: "56px" }}>
          <div style={{ borderTop: "1px solid #ccc", paddingTop: "10px" }}>
            <div style={{ fontSize: "11px", color: "#aaa" }}>Firma y aclaración — Il Pane Nostro</div>
          </div>
          <div style={{ borderTop: "1px solid #ccc", paddingTop: "10px" }}>
            <div style={{ fontSize: "11px", color: "#aaa" }}>Firma y aclaración — Proveedor</div>
          </div>
        </div>

        <div style={{ marginTop: "48px", paddingTop: "16px", borderTop: "1px solid #e5e5e3", fontSize: "11px", color: "#bbb", textAlign: "center" }}>
          Cooperativa de Trabajo Il Pane Nostro Ltda. · CUIT 30-71858060-5 · Documento interno de pago · Emitido el {new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
        </div>
      </div>
    </>
  );
}
