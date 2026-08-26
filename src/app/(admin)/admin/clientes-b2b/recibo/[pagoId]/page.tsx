import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PrintButton } from "./print-button";

export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

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

export default async function ReciboPagoPage({
  params,
}: {
  params: Promise<{ pagoId: string }>;
}) {
  const { pagoId } = await params;
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pago } = await adminClient
    .from("pagos")
    .select(`
      id, monto, fecha, metodo, referencia, notas,
      order_id, factura_numero, created_at,
      cliente:profiles!cliente_id (
        id, full_name, document_number, phone
      ),
      order:orders!order_id ( order_number, total )
    `)
    .eq("id", pagoId)
    .single();

  if (!pago) notFound();

  const authData = pago.cliente?.id
    ? await adminClient.auth.admin.getUserById(pago.cliente.id)
    : null;
  const email = authData?.data?.user?.email ?? null;

  const nroRecibo = pagoId.slice(0, 8).toUpperCase();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f3; margin: 0; }
        .page { background: #fff; max-width: 680px; margin: 0 auto; padding: 56px 56px 80px; min-height: 100vh; }
        @media (max-width: 600px) { .page { padding: 32px 24px 56px; } }
      `}</style>

      {/* Barra de acciones — no se imprime */}
      <div className="no-print fixed top-0 left-0 right-0 bg-neutral-900 text-white px-6 py-3 flex items-center justify-between z-50 gap-4 print:hidden">
        <span className="text-sm text-neutral-300">Recibo de pago — {nroRecibo}</span>
        <div className="flex gap-3">
          <a href={`/admin/clientes-b2b/${pago.cliente?.id}`}
            className="text-sm text-neutral-400 hover:text-white transition-colors">
            ← Volver al cliente
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="page" style={{ marginTop: "52px" }}>

        {/* Encabezado empresa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", paddingBottom: "24px", borderBottom: "2px solid #1a1a18" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.02em", color: "#1a1a18" }}>En Minutas</div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Distribuidora de alimentos congelados</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "4px" }}>Recibo de pago</div>
            <div style={{ fontSize: "18px", fontWeight: "700", fontFamily: "monospace", color: "#1a1a18" }}>#{nroRecibo}</div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{fmtFecha(pago.fecha)}</div>
          </div>
        </div>

        {/* Datos del cliente */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", marginBottom: "12px" }}>Recibido de</div>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "#1a1a18", marginBottom: "6px" }}>
            {pago.cliente?.full_name ?? "Cliente"}
          </div>
          {pago.cliente?.document_number && (
            <div style={{ fontSize: "13px", color: "#555" }}>CUIT: {pago.cliente.document_number}</div>
          )}
          {email && (
            <div style={{ fontSize: "13px", color: "#555" }}>{email}</div>
          )}
          {pago.cliente?.phone && (
            <div style={{ fontSize: "13px", color: "#555" }}>{pago.cliente.phone}</div>
          )}
        </div>

        {/* Detalle del pago */}
        <div style={{ border: "1px solid #e5e5e3", borderRadius: "8px", overflow: "hidden", marginBottom: "32px" }}>
          <div style={{ background: "#f7f6f4", padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "16px", fontSize: "10px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999" }}>
            <span>Concepto</span>
            <span>Método</span>
            <span style={{ textAlign: "right" }}>Importe</span>
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "16px", alignItems: "center", borderTop: "1px solid #e5e5e3" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a18" }}>
                {pago.order?.order_number
                  ? `Pago — Pedido ${pago.order.order_number}`
                  : pago.factura_numero
                    ? `Pago — Factura ${pago.factura_numero}`
                    : "Pago a cuenta"}
              </div>
              {pago.referencia && (
                <div style={{ fontSize: "12px", color: "#888", marginTop: "3px", fontFamily: "monospace" }}>
                  Ref: {pago.referencia}
                </div>
              )}
              {pago.notas && (
                <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{pago.notas}</div>
              )}
            </div>
            <div style={{ fontSize: "13px", color: "#555", whiteSpace: "nowrap" }}>
              {METODOS[pago.metodo] ?? pago.metodo}
            </div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a18", fontVariantNumeric: "tabular-nums", textAlign: "right", whiteSpace: "nowrap" }}>
              {fmt(Number(pago.monto))}
            </div>
          </div>
          <div style={{ background: "#1a1a18", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>Total recibido</span>
            <span style={{ fontSize: "22px", fontWeight: "700", color: "#fff", fontVariantNumeric: "tabular-nums" }}>
              {fmt(Number(pago.monto))}
            </span>
          </div>
        </div>

        {/* Firma */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginTop: "56px" }}>
          <div>
            <div style={{ borderTop: "1px solid #ccc", paddingTop: "10px" }}>
              <div style={{ fontSize: "11px", color: "#aaa" }}>Firma y aclaración — En Minutas</div>
            </div>
          </div>
          <div>
            <div style={{ borderTop: "1px solid #ccc", paddingTop: "10px" }}>
              <div style={{ fontSize: "11px", color: "#aaa" }}>Firma y aclaración — Cliente</div>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div style={{ marginTop: "48px", paddingTop: "16px", borderTop: "1px solid #e5e5e3", fontSize: "11px", color: "#bbb", textAlign: "center" }}>
          En Minutas · Documento interno de cobro · Emitido el {new Date().toLocaleDateString("es-AR")}
        </div>

      </div>

    </>
  );
}
