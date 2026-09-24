import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PedidoStatusBadge } from "@/components/ui";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { AprobarPedidoButton } from "@/components/admin/aprobar-pedido-button";
import { NotasPedidoForm } from "@/components/admin/notas-pedido-form";
import { EditarCantidadesForm } from "@/components/admin/editar-cantidades-form";
import { fmtFechaHora, fmtFecha, fmtFechaSolo } from "@/lib/fecha";
import { MOTIVOS_FALTANTE } from "@/lib/entrega-parcial";
import { ReprogramarFaltanteButton } from "@/components/admin/reprogramar-faltante-button";
import { esCanalFlujo } from "@/lib/order-channels";

export const metadata: Metadata = { title: "Detalle de pedido — Admin En Minutas" };
export const revalidate = 0;

export default async function AdminPedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase    = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const esAdmin = user.app_metadata?.role === "admin";

  const { data: order, error: orderError } = await (adminClient as any)
    .from("orders")
    .select(`
      id, order_number, status, channel, customer_id, entregado_at, total, subtotal, shipping_fee, discount,
      cargo_adicional_concepto, cargo_adicional_monto,
      payment_method, payment_declared_at, payment_confirmed_at,
      shipping_method, shipping_snapshot, delivered_snapshot, origen_order_id, fecha_compromiso, notes, notes_visible_cliente, created_at,
      guest_email, guest_phone, muestra_destinatario, muestra_contacto, muestra_observacion, muestra_prospecto_id, solicitado_por,
      customer:profiles!customer_id (full_name, phone, canal, canal_id, vendedor_id),
      lines:order_lines (
        id, quantity, unit_price, line_total,
        product_snapshot
      )
    `)
    .eq("id", id)
    .single();

  if (orderError) {
    console.error("[pedido-detail] query error:", orderError);
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar el pedido: {orderError.message}
      </div>
    );
  }
  if (!order) notFound();

  const o = order as any;
  const esMuestra = o.channel === "muestra";
  // Tras una entrega parcial las líneas sin nada entregado no se muestran (el faltante va en el bloque de entrega parcial)
  const lineasVisibles = ((o.lines ?? []) as any[]).filter((l) => !o.delivered_snapshot?.lineas || Number(l.quantity) > 0);
  const motivoFaltante = MOTIVOS_FALTANTE.find((m) => m.value === o.delivered_snapshot?.motivo)?.label ?? null;
  const fmtMonto = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;

  // Faltante: pedido del que sale este (si es una reprogramación) y pedido al que se reprogramó el faltante de este
  const faltantes = ((o.delivered_snapshot?.lineas ?? []) as any[]).filter((l) => l.entregado < l.pedido);
  const [{ data: pedidoOrigen }, { data: pedidoReprogramado }] = await Promise.all([
    o.origen_order_id
      ? (adminClient as any).from("orders").select("id, order_number").eq("id", o.origen_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
    (adminClient as any).from("orders").select("id, order_number, status").eq("origen_order_id", o.id).neq("status", "cancelled").maybeSingle(),
  ]);

  // ¿El cliente ya volvió a pedir lo que faltó? (evita duplicar al reprogramar)
  const yaPedido: { name: string; pedidos: string[] }[] = [];
  if (esAdmin && !pedidoReprogramado && faltantes.length > 0 && o.customer_id && o.entregado_at) {
    const { data: posteriores } = await (adminClient as any)
      .from("orders")
      .select("id, order_number")
      .eq("customer_id", o.customer_id)
      .neq("status", "cancelled")
      .neq("id", o.id)
      .gt("created_at", o.entregado_at);
    const ids = ((posteriores ?? []) as any[]).map((x) => x.id);
    if (ids.length > 0) {
      const { data: lineasPost } = await (adminClient as any)
        .from("order_lines")
        .select("order_id, product_id")
        .in("order_id", ids)
        .in("product_id", faltantes.map((l: any) => l.productId));
      const numeroPorId = new Map(((posteriores ?? []) as any[]).map((x) => [x.id, x.order_number as string]));
      for (const f of faltantes as any[]) {
        const nums = [...new Set(((lineasPost ?? []) as any[]).filter((l) => l.product_id === f.productId).map((l) => numeroPorId.get(l.order_id)!))];
        if (nums.length > 0) yaPedido.push({ name: f.name, pedidos: nums });
      }
    }
  }

  // Cobranza del pedido: pagos registrados contra este pedido (antes o después de entregarlo)
  const { data: pagosPedidoRaw } = esAdmin && o.channel === "b2b_mayorista"
    ? await (adminClient as any).from("pagos").select("id, monto, fecha, metodo, sin_factura").eq("order_id", o.id).order("fecha", { ascending: true })
    : { data: [] };
  const pagosPedido = (pagosPedidoRaw ?? []) as { id: string; monto: number; fecha: string; metodo: string; sin_factura: boolean }[];

  // Resolver nombre del vendedor asignado al cliente
  let vendedorNombre: string | null = null;
  if (o.customer?.vendedor_id) {
    const { data: vend } = await (adminClient as any)
      .from("profiles")
      .select("full_name")
      .eq("id", o.customer.vendedor_id)
      .single();
    vendedorNombre = vend?.full_name ?? null;
  }

  const paymentLabel: Record<string, string> = {
    bank_transfer:    "Transferencia bancaria",
    transferencia:    "Transferencia bancaria",
    mercado_pago:     "Mercado Pago",
    cash:             "Efectivo",
    efectivo:         "Efectivo",
    cheque:           "Cheque",
    cuenta_corriente: "Cuenta corriente",
  };

  const shippingLabel: Record<string, string> = {
    delivery:         "Envío a domicilio",
    pickup:           "Retiro en punto",
    national_shipping: "Envío nacional",
    b2b_despacho:     "Despacho B2B",
  };

  // Quién pidió la muestra (el preventista) para que el admin sepa a quién consultar
  let solicitanteNombre: string | null = null;
  if (esMuestra && o.solicitado_por) {
    const { data: sol } = await (adminClient as any).from("profiles").select("full_name").eq("id", o.solicitado_por).maybeSingle();
    solicitanteNombre = sol?.full_name ?? null;
  }

  const customerName  = o.customer?.full_name ?? o.muestra_destinatario ?? "Invitado";
  const customerPhone = o.customer?.phone ?? o.guest_phone;
  const customerEmail = o.guest_email;
  const customerCanal = o.customer?.canal ?? "dist";

  // Productos activos para el form de edición (solo cuando el pedido es editable)
  const ESTADOS_EDITABLES = ["aprobado", "enviado_prod"];
  let productosDisponibles: { id: string; name: string; sku: string | null; costo: number | null; bolsas_caja: number; u_bolsa: number; pkg_unitario: number; pkg_bulto: number; categoria: string | null; divisiones_display: any }[] = [];
  if (esAdmin && ESTADOS_EDITABLES.includes(o.status)) {
    const { data: prods } = await (adminClient as any)
      .from("products")
      .select("id, name, sku, costo, bolsas_caja, u_bolsa, pkg_unitario, pkg_bulto, categoria, divisiones_display")
      .eq("is_active", true)
      .eq("es_muestra", false)
      .order("name");
    productosDisponibles = (prods ?? []).map((p: any) => ({
      id: p.id, name: p.name, sku: p.sku,
      costo: p.costo ? Number(p.costo) : null,
      bolsas_caja: Number(p.bolsas_caja ?? 1),
      u_bolsa: Number(p.u_bolsa ?? 1),
      pkg_unitario: Number(p.pkg_unitario ?? 0),
      pkg_bulto: Number(p.pkg_bulto ?? 0),
      categoria: p.categoria ?? null,
      divisiones_display: p.divisiones_display ?? null,
    }));
  }

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      {/* Header */}
      <div className="mb-5 md:mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/pedidos"
            className="text-sm text-neutral-600 hover:text-neutral-700 transition-colors mb-2 inline-block"
          >
            ← Volver a pedidos
          </Link>
          <h1 className="text-xl md:text-2xl font-semibold font-display font-mono text-neutral-900">
            {o.order_number}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {fmtFechaHora(o.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PedidoStatusBadge status={o.status} />
          {o.status !== "pending_payment" && (
            <Link
              href={`/remito/${id}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
              </svg>
              Remito
            </Link>
          )}
          {esAdmin && esCanalFlujo(o.channel) && o.status === "pending_payment" && (
            <AprobarPedidoButton orderId={o.id} />
          )}
          {esAdmin && (
            <div className="w-44">
              <OrderStatusSelect orderId={o.id} currentStatus={o.status} channel={o.channel} />
            </div>
          )}
        </div>
      </div>

      {pedidoOrigen && (
        <div className="mb-5 rounded-xl bg-warning-bg border border-warning-border px-4 py-3 text-sm text-neutral-700">
          Faltante del pedido{" "}
          <Link href={`/admin/pedidos/${pedidoOrigen.id}`} className="font-mono font-medium underline">{pedidoOrigen.order_number}</Link>
          {o.fecha_compromiso && <> · compromiso de entrega: <span className="font-medium">{fmtFechaSolo(o.fecha_compromiso)}</span></>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
        {/* Cliente */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs font-medium text-neutral-600 mb-3">Cliente</p>
          <p className="text-sm font-medium text-neutral-900">{customerName}</p>
          {esMuestra && o.muestra_contacto && <p className="text-sm text-neutral-600 mt-1">Contacto: {o.muestra_contacto}</p>}
          {customerEmail && <p className="text-sm text-neutral-600 mt-1">{customerEmail}</p>}
          {customerPhone && <p className="text-sm text-neutral-600 mt-1">{customerPhone}</p>}
          {esMuestra && (
            <p className="text-xs text-neutral-600 mt-2 pt-2 border-t border-neutral-100">
              {o.muestra_prospecto_id ? "Prospecto del Pipeline" : o.customer ? "Cliente registrado" : "Contacto suelto"}
              {solicitanteNombre && <> · solicitó <span className="font-medium text-neutral-600">{solicitanteNombre}</span></>}
            </p>
          )}
          {vendedorNombre && (
            <p className="text-xs text-neutral-600 mt-2 pt-2 border-t border-neutral-100">
              Vendedor: <span className="font-medium text-neutral-600">{vendedorNombre}</span>
            </p>
          )}
        </div>

        {/* Pago */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs font-medium text-neutral-600 mb-3">Pago</p>
          <p className="text-sm font-medium text-neutral-900">
            {esMuestra ? "Muestra sin cargo" : (paymentLabel[o.payment_method] ?? o.payment_method)}
          </p>
          {o.payment_declared_at && (
            <p className="text-xs text-neutral-600 mt-1">
              Declarado:{" "}
              {fmtFecha(o.payment_declared_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {o.payment_confirmed_at && (
            <p className="text-xs text-success mt-1">
              Confirmado:{" "}
              {fmtFecha(o.payment_confirmed_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {!o.payment_declared_at && !o.payment_confirmed_at && (
            <p className="text-xs text-neutral-600 mt-1">Sin confirmar</p>
          )}
        </div>

        {/* Envío */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs font-medium text-neutral-600 mb-3">Envío</p>
          <p className="text-sm font-medium text-neutral-900">
            {shippingLabel[o.shipping_method] ?? o.shipping_method}
          </p>
          {o.shipping_snapshot && (
            <p className="text-xs text-neutral-600 mt-1">
              {[
                o.shipping_snapshot.street,
                o.shipping_snapshot.number,
                o.shipping_snapshot.city,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Líneas del pedido */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-neutral-700">Productos</p>
          {esAdmin && !esMuestra && (
            <EditarCantidadesForm
              orderId={o.id}
              status={o.status}
              canal={customerCanal}
              lines={(o.lines ?? []).map((l: any) => ({
                id:               l.id,
                quantity:         l.quantity,
                unit_price:       Number(l.unit_price),
                line_total:       Number(l.line_total),
                product_snapshot: l.product_snapshot,
              }))}
              productos={productosDisponibles}
            />
          )}
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-neutral-100">
          {lineasVisibles.map((line: any) => (
            <div key={line.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-neutral-800 font-medium leading-snug">
                  {line.product_snapshot?.name ?? "Producto"}
                </p>
                {line.product_snapshot?.sku && (
                  <p className="text-xs text-neutral-600 font-mono">{line.product_snapshot.sku}</p>
                )}
                {!esMuestra && (
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {line.quantity} × $ {Number(line.unit_price).toLocaleString("es-AR")}
                  </p>
                )}
              </div>
              <span className="font-semibold text-sm text-neutral-900 tabular-nums shrink-0">
                {esMuestra ? `${line.quantity} u.` : `$ ${Number(line.line_total).toLocaleString("es-AR")}`}
              </span>
            </div>
          ))}
        </div>

        {/* Desktop: tabla */}
        <table className="hidden md:table w-full text-sm">
          <thead>
            <tr className="text-left border-b border-neutral-100">
              <th className="px-5 py-3 text-xs font-semibold text-neutral-600">Producto</th>
              {!esMuestra && <th className="px-5 py-3 text-xs font-semibold text-neutral-600 text-right">Precio u.</th>}
              <th className="px-5 py-3 text-xs font-semibold text-neutral-600 text-right w-20">Cant.</th>
              {!esMuestra && <th className="px-5 py-3 text-xs font-semibold text-neutral-600 text-right">Subtotal</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {lineasVisibles.map((line: any) => (
              <tr key={line.id}>
                <td className="px-5 py-3 text-neutral-800">
                  {line.product_snapshot?.name ?? "Producto"}
                  {line.product_snapshot?.sku && (
                    <span className="ml-2 text-xs text-neutral-600 font-mono">
                      {line.product_snapshot.sku}
                    </span>
                  )}
                </td>
                {!esMuestra && (
                  <td className="px-5 py-3 text-right text-neutral-600">
                    $ {Number(line.unit_price).toLocaleString("es-AR")}
                  </td>
                )}
                <td className="px-5 py-3 text-right text-neutral-600">{line.quantity}</td>
                {!esMuestra && (
                  <td className="px-5 py-3 text-right font-medium text-neutral-900">
                    $ {Number(line.line_total).toLocaleString("es-AR")}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalle entrega parcial */}
      {o.delivered_snapshot?.lineas && (
        <div className="bg-warning-bg border border-warning-border rounded-xl p-5 mb-4">
          <p className="text-sm font-medium text-warning mb-1">Entrega parcial — faltante cerrado</p>
          <p className="text-xs text-neutral-600 mb-3">
            El pedido y la cuenta corriente quedaron solo con lo entregado. Lo que no se entregó no queda pendiente.
          </p>
          <div className="space-y-2">
            {(o.delivered_snapshot.lineas as any[])
              .filter((l: any) => l.entregado < l.pedido)
              .map((l: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700 truncate flex-1 mr-4">{l.name}</span>
                  <span className="tabular-nums font-medium text-warning">
                    entregó {l.entregado} de {l.pedido} · faltó {l.pedido - l.entregado}
                  </span>
                </div>
              ))}
          </div>
          {motivoFaltante && (
            <p className="text-xs text-neutral-600 mt-3">Motivo: {motivoFaltante}</p>
          )}
          {o.delivered_snapshot.total_original != null && (
            <p className="text-xs text-neutral-600 mt-1">
              Total del pedido original: {fmtMonto(Number(o.delivered_snapshot.total_original))} · entregado: {fmtMonto(Number(o.total))}
            </p>
          )}
          {pedidoReprogramado ? (
            <p className="text-sm text-neutral-700 mt-3">
              Faltante reprogramado en{" "}
              <Link href={`/admin/pedidos/${pedidoReprogramado.id}`} className="font-mono font-medium underline">{pedidoReprogramado.order_number}</Link>
              {" "}<PedidoStatusBadge status={pedidoReprogramado.status} />
            </p>
          ) : esAdmin && faltantes.length > 0 ? (
            <ReprogramarFaltanteButton
              orderId={o.id}
              faltante={faltantes.map((l: any) => ({ name: l.name, cantidad: l.pedido - l.entregado }))}
              yaPedido={yaPedido}
            />
          ) : null}
          {o.delivered_snapshot.timestamp && (
            <p className="text-xs text-neutral-600 mt-1">
              Registrado: {new Date(o.delivered_snapshot.timestamp).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      )}

      {esMuestra && o.muestra_observacion && (
        <div className="mb-4 bg-white rounded-xl border border-neutral-200 shadow-sm p-5 text-sm">
          <p className="text-xs font-medium text-neutral-600 mb-1">Motivo de la muestra</p>
          <p className="text-neutral-700">{o.muestra_observacion}</p>
        </div>
      )}

      {/* Totales (las muestras no tienen precio) */}
      {!esMuestra && (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 sm:max-w-xs sm:ml-auto">
        {(() => {
          const total   = Number(o.total);
          const neto    = Math.round(total / 1.21);
          const iva     = total - neto;
          const fmt     = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
          return (
            <div className="space-y-2 text-sm">
              {Number(o.discount) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Bruto</span>
                  <span>{fmt(Number(o.subtotal))}</span>
                </div>
              )}
              {Number(o.discount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Descuento</span>
                  <span>− {fmt(Number(o.discount))}</span>
                </div>
              )}
              {Number(o.shipping_fee) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Envío</span>
                  <span>{fmt(Number(o.shipping_fee))}</span>
                </div>
              )}
              {Number(o.cargo_adicional_monto) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>{o.cargo_adicional_concepto || "Cargo adicional"}</span>
                  <span>{fmt(Number(o.cargo_adicional_monto))}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal (neto s/IVA)</span>
                <span>{fmt(neto)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>IVA (21%)</span>
                <span>{fmt(iva)}</span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-100">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
              {o.delivered_snapshot?.lineas && (
                <p className="text-xs text-neutral-600 pt-1">
                  Total según lo efectivamente entregado.
                </p>
              )}
            </div>
          );
        })()}
      </div>
      )}

      {/* Cobranza: lo pagado contra este pedido vs su total (el total ya refleja lo entregado) */}
      {pagosPedido.length > 0 && (() => {
        const pagado = pagosPedido.reduce((s, x) => s + Number(x.monto), 0);
        const sinFactura = pagosPedido.some((x) => x.sin_factura);
        const saldo = Number(o.total) - pagado;
        return (
          <div className="mt-4 bg-white rounded-xl border border-neutral-200 shadow-sm p-5 sm:max-w-xs sm:ml-auto text-sm space-y-2">
            <p className="text-xs font-medium text-neutral-600">Cobranza</p>
            <div className="flex justify-between text-neutral-600"><span>Total del pedido</span><span>{fmtMonto(Number(o.total))}</span></div>
            <div className="flex justify-between text-neutral-600"><span>Pagado</span><span>{fmtMonto(pagado)}</span></div>
            <div className={`flex justify-between font-semibold pt-2 border-t border-neutral-100 ${saldo > 0.5 && !sinFactura ? "text-danger" : "text-success"}`}>
              <span>{sinFactura ? "Cobrado sin factura" : saldo > 0.5 ? "Saldo pendiente" : saldo < -0.5 ? "A favor del cliente" : "Saldado"}</span>
              <span>{sinFactura ? fmtMonto(pagado) : fmtMonto(Math.abs(saldo))}</span>
            </div>
            {!sinFactura && saldo < -0.5 && (
              <p className="text-xs text-neutral-600">
                Pagó de más (por ejemplo, pagó antes y luego hubo entrega parcial). Se descuenta del saldo general del cliente.
              </p>
            )}
          </div>
        );
      })()}

      {/* Pago confirmado */}
      {o.payment_confirmed_at && (
        <div className="mt-4 bg-success-bg rounded-xl border border-success-border p-4">
          <p className="text-xs font-medium text-success">
            Pago confirmado el{" "}
            {fmtFecha(o.payment_confirmed_at, { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}

      {/* Pago declarado por el cliente */}
      {o.payment_declared_at && !o.payment_confirmed_at && (
        <div className="mt-4 bg-warning-bg rounded-xl border border-warning-border p-4">
          <p className="text-xs font-medium text-warning">
            El cliente declaró el pago el{" "}
            {fmtFecha(o.payment_declared_at, { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}

      {/* Notas */}
      <div className="mt-4">
        <NotasPedidoForm
          orderId={o.id}
          initialNota={o.notes ?? null}
          initialVisibleCliente={o.notes_visible_cliente ?? false}
        />
      </div>
    </div>
  );
}
