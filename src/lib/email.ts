import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM    = process.env.EMAIL_FROM    ?? "En Minutas <noreply@enminutas.com.ar>";
const ADMIN   = process.env.EMAIL_ADMIN   ?? "admin@enminutas.com.ar";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ── Plantillas HTML básicas ────────────────────────────────────────────────────

function baseHtml(body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f0;margin:0;padding:24px}
  .card{background:#fff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #e5e5e5}
  .logo{width:40px;height:40px;background:#7c3d2a;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;margin-bottom:24px;line-height:40px;text-align:center}
  h1{font-size:20px;font-weight:600;color:#171717;margin:0 0 8px}
  p{font-size:14px;color:#525252;line-height:1.6;margin:0 0 16px}
  .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#fef3c7;color:#92400e}
  table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
  th{text-align:left;color:#737373;font-weight:500;padding:8px 0;border-bottom:1px solid #f5f5f5}
  td{padding:8px 0;border-bottom:1px solid #f5f5f5;color:#404040}
  td.right,th.right{text-align:right}
  .total{font-size:16px;font-weight:700;color:#171717}
  .btn{display:inline-block;padding:12px 24px;background:#7c3d2a;color:#fff!important;border-radius:12px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px}
  .footer{margin-top:24px;padding-top:16px;border-top:1px solid #f5f5f5;font-size:12px;color:#a3a3a3}
</style>
</head>
<body>
<div class="card">
  <div class="logo">EM</div>
  ${body}
  <div class="footer">En Minutas · Posadas, Misiones · <a href="${APP_URL}" style="color:#7c3d2a">${APP_URL}</a></div>
</div>
</body>
</html>`;
}

// ── Emails ────────────────────────────────────────────────────────────────────

export async function emailNuevoPedidoB2B({
  orderNumber,
  clientName,
  clientEmail,
  lines,
  total,
}: {
  orderNumber: string;
  clientName:  string;
  clientEmail: string;
  lines:       { name: string; qty: number; unitPrice: number }[];
  total:       number;
}) {
  const lineRows = lines
    .map((l) => `<tr>
      <td>${l.name}</td>
      <td class="right">${l.qty}</td>
      <td class="right">${fmtARS(l.unitPrice)}</td>
      <td class="right">${fmtARS(l.qty * l.unitPrice)}</td>
    </tr>`)
    .join("");

  const html = baseHtml(`
    <h1>Nuevo pedido B2B recibido</h1>
    <p><span class="badge">${orderNumber}</span></p>
    <p><strong>Cliente:</strong> ${clientName} (${clientEmail})</p>
    <table>
      <thead><tr><th>Producto</th><th class="right">Cant.</th><th class="right">Precio u.</th><th class="right">Total</th></tr></thead>
      <tbody>${lineRows}</tbody>
    </table>
    <p class="total">Total c/IVA: ${fmtARS(total)}</p>
    <p>Ingresá al panel para aprobar el pedido.</p>
    <a class="btn" href="${APP_URL}/admin/pedidos">Ver pedidos →</a>
  `);

  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `Nuevo pedido B2B — ${orderNumber}`,
    html,
  });
}

export async function emailClienteAprobado({
  clientEmail,
  clientName,
}: {
  clientEmail: string;
  clientName:  string;
}) {
  const html = baseHtml(`
    <h1>¡Tu acceso fue aprobado!</h1>
    <p>Hola ${clientName},</p>
    <p>Tu solicitud de acceso al <strong>Portal B2B de En Minutas</strong> fue aprobada. Ya podés ingresar al catálogo y realizar pedidos.</p>
    <a class="btn" href="${APP_URL}/login">Ingresar al portal →</a>
    <p style="margin-top:20px">Si tenés alguna consulta, escribinos por WhatsApp o respondé este email.</p>
  `);

  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from:    FROM,
    to:      clientEmail,
    subject: "Tu acceso al portal B2B de En Minutas fue aprobado",
    html,
  });
}

export async function emailNuevoRegistroB2B({
  empresa,
  email,
  canal,
  zona,
}: {
  empresa: string;
  email:   string;
  canal:   string;
  zona:    string;
}) {
  const canalLabel: Record<string, string> = {
    dist:   "Distribuidor / Franquicia",
    gastro: "Gastronomía / Supermercado",
    min:    "Minorista",
  };

  const html = baseHtml(`
    <h1>Nueva solicitud de acceso B2B</h1>
    <p>Un nuevo cliente solicitó acceso al portal B2B.</p>
    <table>
      <tbody>
        <tr><td><strong>Empresa</strong></td><td>${empresa}</td></tr>
        <tr><td><strong>Email</strong></td><td>${email}</td></tr>
        <tr><td><strong>Tipo</strong></td><td>${canalLabel[canal] ?? canal}</td></tr>
        <tr><td><strong>Zona</strong></td><td>${zona}</td></tr>
      </tbody>
    </table>
    <a class="btn" href="${APP_URL}/admin/clientes-b2b">Revisar solicitud →</a>
  `);

  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `Nueva solicitud B2B — ${empresa}`,
    html,
  });
}

export async function emailPagoDeclarado({
  orderId,
  orderNumber,
  clientName,
  clientEmail,
  total,
}: {
  orderId:     string;
  orderNumber: string;
  clientName:  string;
  clientEmail: string;
  total:       number;
}) {
  const html = baseHtml(`
    <h1>Pago declarado por cliente</h1>
    <p>El cliente <strong>${clientName}</strong> (${clientEmail}) declaró haber realizado el pago del pedido
    <span class="badge">${orderNumber}</span>.</p>
    <p class="total">Total: ${fmtARS(total)}</p>
    <p>Verificá la transferencia en tu cuenta bancaria y confirmá el pago desde el panel.</p>
    <a class="btn" href="${APP_URL}/admin/pedidos/${orderId}">Ver pedido →</a>
  `);
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({ from: FROM, to: ADMIN, subject: `Pago declarado — ${orderNumber}`, html });
}

export async function emailPagoConfirmado({
  orderNumber,
  clientEmail,
  clientName,
  isB2B = false,
}: {
  orderNumber: string;
  clientEmail: string;
  clientName:  string;
  isB2B?:      boolean;
}) {
  const portalLink = isB2B ? `${APP_URL}/b2b/pedidos` : `${APP_URL}/mi-cuenta/pedidos`;
  const html = baseHtml(`
    <h1>¡Tu pago fue confirmado!</h1>
    <p>Hola ${clientName},</p>
    <p>Recibimos y confirmamos tu pago del pedido <strong>${orderNumber}</strong>. Ya estamos preparando tu pedido.</p>
    <a class="btn" href="${portalLink}">Ver mis pedidos →</a>
  `);
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({ from: FROM, to: clientEmail, subject: `Pago confirmado — ${orderNumber} — En Minutas`, html });
}

export async function emailNuevoPedidoB2CAdmin({
  orderId,
  orderNumber,
  clientName,
  clientEmail,
  total,
  items,
}: {
  orderId:     string;
  orderNumber: string;
  clientName:  string;
  clientEmail: string;
  total:       number;
  items:       { name: string; qty: number; unitPrice: number }[];
}) {
  const lineRows = items
    .map((l) => `<tr>
      <td>${l.name}</td>
      <td class="right">${l.qty}</td>
      <td class="right">${fmtARS(l.unitPrice)}</td>
      <td class="right">${fmtARS(l.qty * l.unitPrice)}</td>
    </tr>`)
    .join("");

  const html = baseHtml(`
    <h1>Nuevo pedido de la tienda</h1>
    <p><span class="badge">${orderNumber}</span></p>
    <p><strong>Cliente:</strong> ${clientName} (${clientEmail})</p>
    <table>
      <thead><tr><th>Producto</th><th class="right">Cant.</th><th class="right">Precio u.</th><th class="right">Subtotal</th></tr></thead>
      <tbody>${lineRows}</tbody>
    </table>
    <p class="total">Total: ${fmtARS(total)}</p>
    <a class="btn" href="${APP_URL}/admin/pedidos/${orderId}">Ver pedido →</a>
  `);
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({ from: FROM, to: ADMIN, subject: `Nuevo pedido tienda — ${orderNumber}`, html });
}

export async function emailPedidoB2CRecibido({
  orderNumber,
  clientEmail,
  clientName,
  total,
  paymentMethod,
}: {
  orderNumber:   string;
  clientEmail:   string;
  clientName:    string;
  total:         number;
  paymentMethod: string;
}) {
  const isTransfer = paymentMethod === "bank_transfer";

  const html = baseHtml(`
    <h1>${isTransfer ? "Pedido recibido — esperamos tu transferencia" : "¡Pedido confirmado!"}</h1>
    <p>Hola ${clientName},</p>
    <p>Recibimos tu pedido <strong>${orderNumber}</strong> por <strong>${fmtARS(total)}</strong>.</p>
    ${isTransfer ? `<p>Para confirmar tu pedido, realizá la transferencia por el monto exacto usando <strong>${orderNumber}</strong> como concepto.</p>` : "<p>Tu pago fue acreditado. Ya estamos preparando tu pedido.</p>"}
    <a class="btn" href="${APP_URL}/mi-cuenta/pedidos">Ver mis pedidos →</a>
  `);

  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from:    FROM,
    to:      clientEmail,
    subject: `Pedido ${orderNumber} — En Minutas`,
    html,
  });
}
