import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PrintTrigger, PrintButton } from "@/components/remito/print-trigger";
import { fmtFechaSolo } from "@/lib/fecha";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  aprobado:        "Aprobado",
  enviado_prod:    "En producción",
  despachado:      "Despachado",
  delivered:       "Entregado",
  cancelled:       "Cancelado",
};

export default async function RemitoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase    = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await (adminClient as any)
    .from("orders")
    .select(`
      id, order_number, status, channel, total, subtotal, shipping_fee, discount,
      payment_method, payment_confirmed_at, created_at,
      customer_id, guest_email, guest_phone,
      customer:profiles!customer_id (full_name, phone),
      lines:order_lines (
        id, quantity, unit_price, line_total, product_snapshot
      )
    `)
    .eq("id", id)
    .single();

  if (!order) notFound();

  const o = order as any;

  // JWT role es correcto desde migration 012 — no necesitamos admin API
  const role = user.app_metadata?.role as string | undefined;
  const STAFF = ["admin", "vendedor", "produccion", "distribucion"];
  if (!STAFF.includes(role ?? "") && o.customer_id !== user.id) notFound();

  const customerName  = o.customer?.full_name ?? o.guest_email ?? "Cliente";
  const customerPhone = o.customer?.phone ?? o.guest_phone ?? "";

  const paymentLabel: Record<string, string> = {
    bank_transfer:    "Transferencia bancaria",
    transferencia:    "Transferencia bancaria",
    mercado_pago:     "Mercado Pago",
    cash:             "Efectivo",
    efectivo:         "Efectivo",
    cheque:           "Cheque",
    cuenta_corriente: "Cuenta corriente",
  };

  const subtotal    = Number(o.subtotal ?? 0);
  const flete       = Number(o.shipping_fee ?? 0);
  const descuento   = Number(o.discount ?? 0);
  const total       = Number(o.total ?? 0);

  const fecha = fmtFechaSolo(o.created_at);

  return (
    <>
      <PrintTrigger />
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: system-ui, sans-serif; background: #f5f5f5; }
        .page { background: white; max-width: 210mm; margin: 0 auto; padding: 32px 36px; min-height: 297mm; box-shadow: 0 0 20px rgba(0,0,0,.1); }
        @media print { body { background: white; } .page { box-shadow: none; padding: 0; } }
      `}</style>

      <div className="page">
        {/* Botón imprimir — oculto al imprimir */}
        <div className="no-print flex justify-end mb-6 gap-3">
          <a
            href={STAFF.includes(role ?? "") ? `/admin/pedidos/${id}` : `/b2b/pedidos/${id}`}
            className="text-sm text-neutral-500 hover:text-neutral-700 underline"
          >
            ← Volver
          </a>
          <PrintButton />
        </div>

        {/* Encabezado */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "#0E2544", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: 11 }}>EM</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, color: "#111" }}>En Minutas</span>
            </div>
            <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Posadas, Misiones · enminutas.com.ar</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#111", fontFamily: "monospace" }}>{o.order_number}</p>
            <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>REMITO — {fecha}</p>
            <p style={{ fontSize: 11, marginTop: 4, fontWeight: 600, padding: "2px 8px", borderRadius: 4, display: "inline-block",
              background: o.status === "delivered" ? "#dcfce7" : "#fef9c3",
              color: o.status === "delivered" ? "#166534" : "#854d0e",
            }}>
              {STATUS_LABEL[o.status] ?? o.status}
            </p>
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="mb-8">
          <p style={{ fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Cliente
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 32px", fontSize: 13 }}>
            <div>
              <span style={{ color: "#666" }}>Nombre: </span>
              <span style={{ fontWeight: 600, color: "#111" }}>{customerName}</span>
            </div>
            {customerPhone && (
              <div>
                <span style={{ color: "#666" }}>Teléfono: </span>
                <span style={{ color: "#111" }}>{customerPhone}</span>
              </div>
            )}
            <div>
              <span style={{ color: "#666" }}>Forma de pago: </span>
              <span style={{ color: "#111" }}>{paymentLabel[o.payment_method] ?? o.payment_method ?? "—"}</span>
            </div>
            {o.payment_confirmed_at && (
              <div>
                <span style={{ color: "#666" }}>Pago confirmado: </span>
                <span style={{ color: "#166534", fontWeight: 600 }}>
                  {fmtFechaSolo(o.payment_confirmed_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de productos */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px 6px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Producto</th>
              <th style={{ textAlign: "center", padding: "8px 6px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase", width: 50 }}>Cant.</th>
              <th style={{ textAlign: "right", padding: "8px 6px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase", width: 110 }}>Precio u.</th>
              <th style={{ textAlign: "right", padding: "8px 6px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase", width: 110 }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(o.lines ?? []).map((line: any, i: number) => (
              <tr key={line.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "10px 6px", color: "#111" }}>
                  <div style={{ fontWeight: 500 }}>{line.product_snapshot?.name ?? "Producto"}</div>
                  {line.product_snapshot?.unit_label && (
                    <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{line.product_snapshot.unit_label}</div>
                  )}
                  {line.product_snapshot?.sku && (
                    <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace" }}>{line.product_snapshot.sku}</div>
                  )}
                </td>
                <td style={{ padding: "10px 6px", textAlign: "center", color: "#374151", fontWeight: 600 }}>{line.quantity}</td>
                <td style={{ padding: "10px 6px", textAlign: "right", color: "#374151", fontFamily: "monospace" }}>{fmt(Number(line.unit_price))}</td>
                <td style={{ padding: "10px 6px", textAlign: "right", color: "#111", fontWeight: 600, fontFamily: "monospace" }}>{fmt(Number(line.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
          <div style={{ width: 240, fontSize: 13 }}>
            {subtotal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#555" }}>
                <span>Subtotal s/IVA</span>
                <span style={{ fontFamily: "monospace" }}>{fmt(subtotal)}</span>
              </div>
            )}
            {flete > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#555" }}>
                <span>Flete</span>
                <span style={{ fontFamily: "monospace" }}>{fmt(flete)}</span>
              </div>
            )}
            {descuento > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#166534" }}>
                <span>Descuento</span>
                <span style={{ fontFamily: "monospace" }}>− {fmt(descuento)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px", borderTop: "2px solid #111", marginTop: 4, fontWeight: 700, fontSize: 15, color: "#111" }}>
              <span>Total c/IVA</span>
              <span style={{ fontFamily: "monospace" }}>{fmt(total)}</span>
            </div>
            <p style={{ fontSize: 10, color: "#888", marginTop: 2 }}>IVA (21%) incluido en todos los precios</p>
          </div>
        </div>

        {/* Firma */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 8 }}>
          <div>
            <div style={{ borderBottom: "1px solid #111", height: 40, marginBottom: 6 }} />
            <p style={{ fontSize: 11, color: "#666", textAlign: "center" }}>Firma y aclaración — Receptor</p>
          </div>
          <div>
            <div style={{ borderBottom: "1px solid #111", height: 40, marginBottom: 6 }} />
            <p style={{ fontSize: 11, color: "#666", textAlign: "center" }}>Fecha de recepción</p>
          </div>
        </div>

        {/* Pie */}
        <div style={{ marginTop: 40, textAlign: "center", fontSize: 10, color: "#bbb" }}>
          En Minutas · Posadas, Misiones · enminutas.com.ar
        </div>
      </div>
    </>
  );
}
