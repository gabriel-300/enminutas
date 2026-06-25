import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { CSSProperties } from "react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);

const COND_IVA_LABEL: Record<string, string> = {
  responsable_inscripto: "Responsable Inscripto",
  monotributista:        "Monotributista",
  consumidor_final:      "Consumidor Final",
  exento:                "Exento",
};

const PAGO_LABEL: Record<string, string> = {
  contado: "Contado", "30_dias": "30 días", "60_dias": "60 días", "90_dias": "90 días", cheque: "Cheque diferido",
};

function numCmp(tipo: string, pv: number, numero: number | null) {
  if (!numero) return "BORRADOR";
  return `${tipo} ${String(pv).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

const S = {
  th: {
    padding: "8px 12px",
    textAlign: "left" as const,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: ".5px",
    color: "#6b7280",
    borderBottom: "1px solid #e5e7eb",
  } satisfies CSSProperties,
  td: {
    padding: "8px 12px",
    fontSize: 13,
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
  } satisfies CSSProperties,
  tdr: {
    padding: "8px 12px",
    fontSize: 13,
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
    textAlign: "right" as const,
    fontVariantNumeric: "tabular-nums" as const,
  } satisfies CSSProperties,
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    padding: "4px 0",
  } satisfies CSSProperties,
};

export default async function FacturaPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createAdminClient() as any;

  const { data: f } = await db.from("facturas").select("*").eq("id", id).single();
  if (!f) notFound();

  const { data: itemsData } = await db
    .from("factura_items").select("*").eq("factura_id", id).order("orden");

  const items = (itemsData ?? []) as any[];
  const fecha = f.fecha_emision
    ? new Date(f.fecha_emision + "T12:00:00").toLocaleDateString("es-AR")
    : new Date(f.created_at).toLocaleDateString("es-AR");

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <title>{numCmp(f.tipo, f.punto_venta, f.numero)} — En Minutas</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            @page { margin: 20mm 15mm; }
          }
        `}</style>
      </head>
      <body>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 32 }}>

          {/* Botón imprimir */}
          <div className="no-print" style={{ marginBottom: 24, display: "flex", justifyContent: "flex-end" }}>
            <button
              id="btn-print"
              style={{ padding: "8px 20px", background: "#16233f", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
            >
              Imprimir / Guardar PDF
            </button>
          </div>

          {/* Aviso sin validez fiscal */}
          {!f.cae && (
            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 14px", marginBottom: 20, fontSize: 12, color: "#92400e" }}>
              COMPROBANTE SIN VALIDEZ FISCAL — Pendiente de integración con ARCA/AFIP
            </div>
          )}

          {/* Header comprobante */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, borderBottom: "2px solid #16233f", paddingBottom: 20 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#16233f", letterSpacing: -0.5 }}>En Minutas</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Punto de venta: {String(f.punto_venta).padStart(4, "0")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#16233f" }}>{f.tipo}</div>
              <div style={{ fontSize: 14, color: "#374151", marginTop: 4 }}>FACTURA</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#374151", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {numCmp(f.tipo, f.punto_venta, f.numero)}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Fecha: {fecha}</div>
              {f.fecha_vencimiento && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Vence: {new Date(f.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-AR")}
                </div>
              )}
            </div>
          </div>

          {/* Emisor / Receptor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 8 }}>Emisor</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>En Minutas</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 8 }}>Receptor</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{f.razon_social}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>CUIT: {f.cuit}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{COND_IVA_LABEL[f.condicion_iva] ?? f.condicion_iva}</div>
              {f.domicilio_fiscal && <div style={{ fontSize: 12, color: "#6b7280" }}>{f.domicilio_fiscal}</div>}
            </div>
          </div>

          {/* Condiciones */}
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 16px", marginBottom: 24, display: "flex", gap: 32 }}>
            <div style={{ fontSize: 12 }}><span style={{ color: "#9ca3af" }}>Condición de pago: </span><strong>{PAGO_LABEL[f.condicion_pago] ?? f.condicion_pago}</strong></div>
            {f.pedido_refs?.length > 0 && (
              <div style={{ fontSize: 12 }}><span style={{ color: "#9ca3af" }}>Pedidos: </span><strong>{f.pedido_refs.join(", ")}</strong></div>
            )}
          </div>

          {/* Tabla de ítems */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={S.th}>Descripción</th>
                <th style={{ ...S.th, textAlign: "right" }}>Cant.</th>
                <th style={{ ...S.th, textAlign: "right" }}>U.</th>
                <th style={{ ...S.th, textAlign: "right" }}>Precio unit.</th>
                <th style={{ ...S.th, textAlign: "right" }}>IVA</th>
                <th style={{ ...S.th, textAlign: "right" }}>Subtotal</th>
                <th style={{ ...S.th, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, i: number) => (
                <tr key={it.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={S.td}>{it.descripcion}</td>
                  <td style={S.tdr}>{it.cantidad}</td>
                  <td style={S.tdr}>{it.unidad}</td>
                  <td style={S.tdr}>{fmt(Number(it.precio_unitario))}</td>
                  <td style={S.tdr}>{it.alicuota_iva}%</td>
                  <td style={S.tdr}>{fmt(Number(it.subtotal))}</td>
                  <td style={{ ...S.tdr, fontWeight: 600 }}>{fmt(Number(it.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen IVA */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 300 }}>
              {Number(f.neto_gravado_21) > 0 && <>
                <div style={S.row}><span style={{ color: "#6b7280" }}>Neto gravado 21%</span><span>{fmt(Number(f.neto_gravado_21))}</span></div>
                <div style={S.row}><span style={{ color: "#6b7280" }}>IVA 21%</span><span>{fmt(Number(f.iva_21))}</span></div>
              </>}
              {Number(f.neto_gravado_105) > 0 && <>
                <div style={S.row}><span style={{ color: "#6b7280" }}>Neto gravado 10,5%</span><span>{fmt(Number(f.neto_gravado_105))}</span></div>
                <div style={S.row}><span style={{ color: "#6b7280" }}>IVA 10,5%</span><span>{fmt(Number(f.iva_105))}</span></div>
              </>}
              {Number(f.neto_no_gravado) > 0 &&
                <div style={S.row}><span style={{ color: "#6b7280" }}>No gravado</span><span>{fmt(Number(f.neto_no_gravado))}</span></div>
              }
              <div style={{ ...S.row, borderTop: "2px solid #16233f", marginTop: 8, paddingTop: 8, fontWeight: 700, fontSize: 16 }}>
                <span>TOTAL</span><span>{fmt(Number(f.total))}</span>
              </div>
            </div>
          </div>

          {f.observaciones && (
            <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 16, fontSize: 12, color: "#6b7280" }}>
              <strong>Observaciones:</strong> {f.observaciones}
            </div>
          )}

          {/* CAE */}
          {f.cae ? (
            <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 16, fontSize: 11, color: "#6b7280" }}>
              <div>CAE: {f.cae}</div>
              <div>Vencimiento CAE: {f.cae_vencimiento ? new Date(f.cae_vencimiento + "T12:00:00").toLocaleDateString("es-AR") : "—"}</div>
            </div>
          ) : (
            <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 12, fontSize: 10, color: "#d1d5db", textAlign: "center" }}>
              CAE: PENDIENTE — Comprobante interno sin validez fiscal
            </div>
          )}
        </div>

        <script dangerouslySetInnerHTML={{ __html: `document.getElementById('btn-print').addEventListener('click', function(){ window.print(); });` }} />
      </body>
    </html>
  );
}
