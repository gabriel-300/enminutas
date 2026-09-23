"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailPagoConfirmado, emailPedidoModificadoDespacho } from "@/lib/email";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import { calcularEntregaParcial, calcularFaltante, esMotivoFaltante, type EntregaLineaInput } from "@/lib/entrega-parcial";
import { insertarPedidoB2B } from "@/lib/order-number";
import { requireAdmin } from "@/lib/auth";

async function logOrderEvent(
  db: ReturnType<typeof createAdminClient>,
  orderId: string,
  status: string,
  message: string,
  actorId?: string,
) {
  await (db as any).from("order_events").insert({
    order_id: orderId,
    status,
    message,
    actor_id: actorId ?? null,
  });
}

async function getCallerRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (user.app_metadata?.role as string) ?? null;
}

// Estados que admin puede setear manualmente (casos excepcionales)
const ALLOWED_MANUAL_STATUSES = ["pending_payment", "aprobado", "cancelled", "liquidado"] as const;

export async function updateOrderStatus(orderId: string, status: string) {
  const role = await getCallerRole();
  if (role !== "admin") throw new Error("No autorizado");

  if (!(ALLOWED_MANUAL_STATUSES as readonly string[]).includes(status))
    throw new Error(`Estado "${status}" no se puede asignar manualmente. Usá las acciones del workflow.`);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: status as any })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pedidos");
}

export async function aprobarPedidoB2B(orderId: string) {
  const supabase    = createAdminClient();
  const authClient  = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  if (user.app_metadata?.role !== "admin") throw new Error("No autorizado");

  // Verificar límite de crédito para pedidos en cuenta corriente
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("total, payment_method, customer_id, status")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Pedido no encontrado");
  if (order.status !== "pending_payment") throw new Error("El pedido ya fue procesado o no existe");

  if (order.payment_method === "cuenta_corriente" && order.customer_id) {
    const { data: cuenta } = await (supabase as any)
      .from("b2b_accounts")
      .select("credit_limit")
      .eq("profile_id", order.customer_id)
      .single();

    const limite = Number(cuenta?.credit_limit ?? 0);
    if (limite > 0) {
      const { data: movs } = await (supabase as any)
        .from("cc_movimientos")
        .select("monto")
        .eq("cliente_id", order.customer_id);
      const saldoActual = (movs ?? []).reduce((s: number, m: any) => s + Number(m.monto), 0);
      if (saldoActual + Number(order.total) > limite) {
        const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
        throw new Error(
          `Límite de crédito excedido. Saldo actual: ${fmt(saldoActual)}, pedido: ${fmt(Number(order.total))}, límite: ${fmt(limite)}.`
        );
      }
    }
  }

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({
      status:       "aprobado",
      aprobado_por: user.id,
      aprobado_at:  new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido ya fue procesado o no existe");
  await logOrderEvent(supabase, orderId, "aprobado", "Pedido aprobado", user.id);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/produccion");
}

export async function marcarEnviadoProd(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "produccion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  // Update con guard de estado para atomicidad — 0 filas = estado incorrecto
  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "enviado_prod" })
    .eq("id", orderId)
    .eq("status", "aprobado")
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido debe estar aprobado para iniciar preparación");
  await logOrderEvent(supabase, orderId, "enviado_prod", "Enviado a producción");
  revalidatePath("/admin/produccion");
}

export async function despacharPedido(orderId: string) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "produccion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: lines } = await (supabase as any)
    .from("order_lines")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  // Update con guard de estado para atomicidad
  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "despachado", despachado_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "enviado_prod")
    .select("id, payment_method, customer_id, total, order_number");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido debe estar en preparación para despacharse");
  await logOrderEvent(supabase, orderId, "despachado", "Pedido despachado");

  // Auto-cargo en cuenta corriente
  const ord = updated[0] as any;
  if (ord.payment_method === "cuenta_corriente" && ord.customer_id) {
    await (supabase as any).from("cc_movimientos").insert({
      cliente_id:  ord.customer_id,
      order_id:    orderId,
      tipo:        "cargo",
      descripcion: `Pedido ${ord.order_number}`,
      monto:       Number(ord.total),
      fecha:       new Date().toISOString().slice(0, 10),
      created_by:  user.id,
    });
  }

  for (const line of (lines ?? []) as { product_id: string; quantity: number }[]) {
    await (supabase as any).rpc("consume_lote_stock", {
      p_product_id: line.product_id,
      p_qty:        line.quantity,
    });
    await (supabase as any).from("stock_movements").insert({
      product_id: line.product_id,
      qty:        -line.quantity,
      type:       "despacho",
      order_id:   orderId,
    });
  }
  // Stock insuficiente es advertencia, no bloquea el despacho (puede haber stock manual)
  // pero queda registrado en el log de la request si se necesita auditar

  revalidatePath("/admin/produccion");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/remito/${orderId}`);
}

export async function confirmarPago(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin") throw new Error("No autorizado");

  const supabase = createAdminClient();
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("status, channel, order_number, total, guest_email, customer_id, customer:profiles!customer_id(full_name)")
    .eq("id", orderId)
    .single();

  const o = order as any;

  const authClient2 = await createClient();
  const { data: { user: adminUser } } = await authClient2.auth.getUser();

  const updates: Record<string, any> = {
    payment_confirmed_at: new Date().toISOString(),
  };
  if (o?.status === "pending_payment" && adminUser) {
    updates.status       = "aprobado";
    updates.aprobado_por = adminUser.id;
    updates.aprobado_at  = new Date().toISOString();
  }

  const { error } = await (supabase as any).from("orders").update(updates).eq("id", orderId);
  if (error) throw new Error(error.message);
  await logOrderEvent(supabase, orderId, updates.status ?? o?.status, "Pago confirmado", adminUser?.id);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/dashboard");

  if (o?.order_number) {
    let clientEmail: string | undefined = o.guest_email;
    let clientName: string = o.customer?.full_name ?? "Cliente";

    if (!clientEmail && o.customer_id) {
      const { data } = await (supabase as any).auth.admin.getUserById(o.customer_id);
      clientEmail = data?.user?.email;
    }

    if (clientEmail) {
      emailPagoConfirmado({
        orderNumber: o.order_number,
        clientEmail,
        clientName,
        isB2B: o.channel === "b2b_mayorista",
      }).catch(() => {});
    }
  }
}

export async function iniciarDistribucion(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "distribucion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "en_distribucion" })
    .eq("id", orderId)
    .eq("status", "despachado")
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido debe estar despachado para iniciar distribución");
  await logOrderEvent(supabase, orderId, "en_distribucion", "Distribución iniciada");

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/produccion");
}

export async function confirmarEntrega(orderId: string) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "distribucion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "delivered", entregado_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", ["despachado", "en_distribucion"])
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido no está en estado de distribución");
  await logOrderEvent(supabase, orderId, "delivered", "Entrega confirmada");

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
}

export type LineaAjuste = {
  lineId:            string;
  productId:         string;
  quantityDespacho:  number;
  unitPrice:         number;
};

export type DespachoInfo = {
  repartidor:    string;
  fecha_entrega: string;
  hora_entrega:  string;
  patente:       string;
};

export async function despacharPedidoConAjuste(
  orderId: string,
  ajustes: LineaAjuste[],
  despachoInfo?: DespachoInfo,
) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "produccion") throw new Error("No autorizado");

  const supabase = createAdminClient();

  // Verificar que el pedido esté en enviado_prod
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("id, status, subtotal, shipping_fee, discount, payment_method, customer_id, order_number, customer:profiles!customer_id(full_name, vendedor_id)")
    .eq("id", orderId)
    .single();
  if (!order || order.status !== "enviado_prod")
    throw new Error("El pedido debe estar en preparación para despacharse");

  // Capturar cantidades originales antes de modificar (para el email de alerta)
  const { data: originalLines } = await (supabase as any)
    .from("order_lines")
    .select("id, quantity, product_snapshot")
    .eq("order_id", orderId);
  const originalMap = new Map<string, { quantity: number; nombre: string }>(
    (originalLines ?? []).map((l: any) => [
      l.id,
      { quantity: Number(l.quantity), nombre: l.product_snapshot?.name ?? "Producto" },
    ])
  );

  // Actualizar cantidades si alguna difiere
  for (const a of ajustes) {
    const newTotal = Math.round(a.unitPrice * a.quantityDespacho);
    const { error: errLinea } = await (supabase as any)
      .from("order_lines")
      .update({ quantity: a.quantityDespacho, line_total: newTotal })
      .eq("id", a.lineId);
    if (errLinea) throw new Error(`No se pudo ajustar la línea: ${errLinea.message}`);
  }

  // Recalcular subtotal y total del pedido a partir de las líneas actualizadas
  const { data: lines } = await (supabase as any)
    .from("order_lines")
    .select("line_total")
    .eq("order_id", orderId);
  const newSubtotal = (lines as { line_total: number }[]).reduce(
    (acc, l) => acc + Number(l.line_total), 0
  );
  const flete     = Number(order.shipping_fee ?? 0);
  const descuento = Number(order.discount ?? 0);
  const newTotal  = newSubtotal + flete - descuento;

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({
      status:        "despachado",
      despachado_at: new Date().toISOString(),
      subtotal:      newSubtotal,
      total:         newTotal,
      despacho_info: despachoInfo ?? null,
    })
    .eq("id", orderId)
    .eq("status", "enviado_prod")
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido ya fue procesado");

  await logOrderEvent(supabase, orderId, "despachado", "Pedido despachado con ajuste de cantidades");

  // Email de alerta cuando alguna cantidad difiere del original
  const lineasEmail = ajustes.map((a) => {
    const orig = originalMap.get(a.lineId);
    return { nombre: orig?.nombre ?? "Producto", pedido: orig?.quantity ?? a.quantityDespacho, despachado: a.quantityDespacho };
  });
  const hayAjuste = lineasEmail.some((l) => l.despachado !== l.pedido);

  if (hayAjuste) {
    const o = order as any;
    const clientName: string = o.customer?.full_name ?? "Cliente";
    let clientEmail: string | undefined;
    let vendedorEmail: string | undefined;

    if (o.customer_id) {
      const { data: authData } = await (supabase as any).auth.admin.getUserById(o.customer_id);
      clientEmail = authData?.user?.email;
    }

    if (o.customer?.vendedor_id) {
      const { data: vendedores } = await (supabase as any).auth.admin.listUsers({ perPage: 500 });
      const vend = (vendedores?.users ?? []).find((u: any) => u.id === o.customer.vendedor_id);
      vendedorEmail = vend?.email;
    }

    emailPedidoModificadoDespacho({
      orderId,
      orderNumber: o.order_number,
      clientName,
      clientEmail,
      vendedorEmail,
      lineas:     lineasEmail,
      nuevoTotal: newTotal,
    }).catch(() => {});
  }

  // Auto-cargo en cuenta corriente con el total ajustado
  if (order.payment_method === "cuenta_corriente" && order.customer_id) {
    await (supabase as any).from("cc_movimientos").insert({
      cliente_id:  order.customer_id,
      order_id:    orderId,
      tipo:        "cargo",
      descripcion: `Pedido ${order.order_number}`,
      monto:       newTotal,
      fecha:       new Date().toISOString().slice(0, 10),
      created_by:  user.id,
    });
  }

  // Decrementar stock con cantidades ajustadas
  for (const a of ajustes) {
    if (a.quantityDespacho <= 0) continue;
    await (supabase as any).rpc("consume_lote_stock", {
      p_product_id: a.productId,
      p_qty:        a.quantityDespacho,
    });
    await (supabase as any).from("stock_movements").insert({
      product_id: a.productId,
      qty:        -a.quantityDespacho,
      type:       "despacho",
      order_id:   orderId,
    });
  }

  revalidatePath("/admin/produccion");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath(`/remito/${orderId}`);
}

export async function agregarNota(orderId: string, nota: string, visibleCliente: boolean = false) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "vendedor") throw new Error("No autorizado");

  const supabase = createAdminClient();

  if (role === "vendedor") {
    const { data: order } = await (supabase as any)
      .from("orders")
      .select("customer_id, customer:profiles!customer_id(vendedor_id)")
      .eq("id", orderId)
      .single();
    if (!order || (order as any).customer?.vendedor_id !== user.id) throw new Error("No autorizado");
  }

  const { error } = await (supabase as any)
    .from("orders")
    .update({ notes: nota.trim() || null, notes_visible_cliente: visibleCliente })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath(`/remito/${orderId}`);
}

// Devuelve al stock (lotes, FEFO inverso, y products.stock_cajas) lo que volvió al depósito sin entregar.
// Devuelve el mensaje de error, o null si salió bien.
async function reintegrarStock(
  db: ReturnType<typeof createAdminClient>,
  productId: string,
  qty: number,
  orderId: string,
  notes: string,
): Promise<string | null> {
  const { error } = await (db as any).rpc("reintegrar_lote_stock", { p_product_id: productId, p_qty: qty });
  if (error) return error.message;
  const { error: errMov } = await (db as any).from("stock_movements").insert({
    product_id: productId,
    qty,
    type:       "ajuste",
    order_id:   orderId,
    notes,
  });
  return errMov?.message ?? null;
}

// Lo que el pedido tiene hoy en cuenta corriente (cargos + ajustes; los pagos se llevan aparte).
async function cargoNetoCC(db: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data } = await (db as any)
    .from("cc_movimientos")
    .select("monto")
    .eq("order_id", orderId)
    .in("tipo", ["cargo", "ajuste"]);
  const movs = (data ?? []) as { monto: number }[];
  return { cantidad: movs.length, neto: movs.reduce((s, m) => s + Number(m.monto), 0) };
}

// Entrega parcial: lo que no se entregó se CIERRA (no queda pendiente). El pedido pasa a reflejar solo
// lo entregado (order_lines, subtotal y total); lo pedido originalmente y el motivo del faltante quedan
// en delivered_snapshot. Las cantidades pedidas y los precios salen de la base, no del cliente.
export async function confirmarEntregaParcial(
  orderId: string,
  entregas: EntregaLineaInput[],
  motivo?: string,
) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const role = user?.app_metadata?.role as string | undefined;
  if (!user || (role !== "admin" && role !== "distribucion")) throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: order } = await (supabase as any)
    .from("orders")
    .select("status, total, shipping_fee, discount, cargo_adicional_monto, payment_method, customer_id, order_number")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Pedido no encontrado");
  if (!["despachado", "en_distribucion"].includes(order.status))
    throw new Error("El pedido no está en estado de distribución");

  const { data: orderLines } = await (supabase as any)
    .from("order_lines")
    .select("id, product_id, quantity, unit_price, product_snapshot")
    .eq("order_id", orderId);
  if (!orderLines?.length) throw new Error("El pedido no tiene líneas");

  const calc = calcularEntregaParcial({
    lineas:         orderLines,
    entregas,
    descuento:      Number(order.discount ?? 0),
    flete:          Number(order.shipping_fee ?? 0),
    cargoAdicional: Number(order.cargo_adicional_monto ?? 0),
  });

  // Todo entregado: es una entrega normal
  if (calc.todoEntregado) {
    await confirmarEntrega(orderId);
    return;
  }
  if (calc.nadaEntregado)
    throw new Error("No se entregó nada del pedido: pedile al administrador que lo cancele desde distribución.");
  if (!esMotivoFaltante(motivo)) throw new Error("Indicá el motivo del faltante");

  const totalOriginal = Number(order.total);
  const ahora = new Date().toISOString();

  // Primero el cambio de estado, con guard: si dos personas confirman a la vez, solo una pasa
  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({
      status:       "entrega_parcial",
      entregado_at: ahora,
      subtotal:     calc.subtotal,
      discount:     calc.descuento,
      total:        calc.total,
      delivered_snapshot: {
        lineas: calc.lineas.map((l) => ({
          lineId: l.lineId, productId: l.productId, name: l.name, pedido: l.pedido, entregado: l.entregado,
        })),
        motivo,
        total_original: totalOriginal,
        timestamp: ahora,
      },
    })
    .eq("id", orderId)
    .in("status", ["despachado", "en_distribucion"])
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido no está en estado de distribución");

  // Los pasos que siguen se controlan uno a uno: si alguno falla se avisa, no se pasa en silencio
  const fallos: string[] = [];

  // 1. Las líneas pasan a reflejar lo entregado
  for (const l of calc.lineas) {
    if (l.entregado === l.pedido) continue;
    const { error: errLinea } = await (supabase as any)
      .from("order_lines")
      .update({ quantity: l.entregado, line_total: l.lineTotal })
      .eq("id", l.lineId)
      .eq("order_id", orderId);
    if (errLinea) fallos.push(`línea ${l.name}: ${errLinea.message}`);
  }

  // 2. Cuenta corriente: llevar el cargo al total entregado
  if (order.payment_method === "cuenta_corriente" && order.customer_id) {
    const { cantidad, neto } = await cargoNetoCC(supabase, orderId);
    const diferencia = Math.round((calc.total - neto) * 100) / 100;
    if (Math.abs(diferencia) >= 0.01) {
      const { error: errCC } = await (supabase as any).from("cc_movimientos").insert({
        cliente_id:  order.customer_id,
        order_id:    orderId,
        tipo:        cantidad === 0 ? "cargo" : "ajuste",
        descripcion: cantidad === 0
          ? `Pedido ${order.order_number} (entrega parcial)`
          : `Ajuste por entrega parcial — Pedido ${order.order_number}`,
        monto:       diferencia,
        fecha:       ahora.slice(0, 10),
        created_by:  user.id,
      });
      if (errCC) fallos.push(`cuenta corriente: ${errCC.message}`);
    }
  }

  // 3. Lo no entregado vuelve al stock
  for (const l of calc.lineas) {
    const noEntregado = l.pedido - l.entregado;
    if (noEntregado <= 0) continue;
    const errStock = await reintegrarStock(
      supabase, l.productId, noEntregado, orderId,
      `Reintegro entrega parcial — ${noEntregado} de ${l.pedido} no entregados`,
    );
    if (errStock) fallos.push(`stock ${l.name}: ${errStock}`);
  }

  // Si el cliente ya había pagado este pedido (pago anticipado), lo que exceda el nuevo total queda a su favor.
  // No se mueve plata: el saldo del cliente (facturado − pagado) ya lo refleja; acá solo se deja constancia.
  const { data: pagosPedido } = await (supabase as any).from("pagos").select("monto, sin_factura").eq("order_id", orderId);
  const pagadoPedido = ((pagosPedido ?? []) as any[]).reduce((s, x) => s + Number(x.monto), 0);
  const cobradoSinFactura = ((pagosPedido ?? []) as any[]).some((x) => x.sin_factura);
  const aFavor = !cobradoSinFactura && pagadoPedido - calc.total > 0.5 ? Math.round((pagadoPedido - calc.total) * 100) / 100 : 0;

  await logOrderEvent(
    supabase, orderId, "entrega_parcial",
    `Entrega parcial — faltante cerrado (${motivo}). Total de $${totalOriginal} a $${calc.total}` +
      (aFavor > 0 ? ` — el cliente ya había pagado $${pagadoPedido}: quedan $${aFavor} a su favor` : "") +
      (fallos.length ? ` — ATENCIÓN, fallaron: ${fallos.join("; ")}` : ""),
    user.id,
  );

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/cuentas-corrientes");
  revalidatePath("/admin/reportes");
  revalidatePath("/admin/stock");
  if (order.customer_id) {
    revalidatePath(`/admin/clientes-b2b/${order.customer_id}`);
    revalidatePath(`/admin/cuentas-corrientes/${order.customer_id}`);
  }
  revalidatePath(`/remito/${orderId}`);

  if (fallos.length)
    throw new Error(`La entrega parcial se registró, pero falló: ${fallos.join("; ")}. Avisale al administrador.`);
}

// Cancela un pedido ya despachado / en distribución (antes de que se confirme
// entrega). Revierte el stock consumido en el despacho y, si el pedido era
// cuenta corriente, anula lo cargado — a diferencia de updateOrderStatus,
// que solo cambia el status sin tocar stock ni cta cte.
export async function cancelarPedidoDistribucion(orderId: string) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");

  const supabase = createAdminClient();

  const { data: order } = await (supabase as any)
    .from("orders")
    .select("id, status, payment_method, customer_id, order_number")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Pedido no encontrado");
  if (!["despachado", "en_distribucion"].includes(order.status))
    throw new Error("Solo se puede cancelar desde acá un pedido despachado o en distribución");

  const { data: lines } = await (supabase as any)
    .from("order_lines")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .in("status", ["despachado", "en_distribucion"])
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido ya fue procesado");

  const fallos: string[] = [];

  // Reintegrar el stock consumido al despachar
  for (const line of (lines ?? []) as { product_id: string; quantity: number }[]) {
    if (Number(line.quantity) <= 0) continue;
    const errStock = await reintegrarStock(
      supabase, line.product_id, Number(line.quantity), orderId,
      "Reintegro por cancelación de pedido en distribución",
    );
    if (errStock) fallos.push(`stock: ${errStock}`);
  }

  // Revertir lo que el pedido tenga cargado en cuenta corriente, si lo hubo
  if (order.payment_method === "cuenta_corriente" && order.customer_id) {
    const { cantidad, neto } = await cargoNetoCC(supabase, orderId);
    if (cantidad > 0 && Math.abs(neto) >= 0.01) {
      const { error: errCC } = await (supabase as any).from("cc_movimientos").insert({
        cliente_id:  order.customer_id,
        order_id:    orderId,
        tipo:        "ajuste",
        descripcion: `Reversión por cancelación — Pedido ${order.order_number}`,
        monto:       -neto,
        fecha:       new Date().toISOString().slice(0, 10),
        created_by:  user.id,
      });
      if (errCC) fallos.push(`cuenta corriente: ${errCC.message}`);
    }
  }

  await logOrderEvent(
    supabase, orderId, "cancelled",
    "Pedido cancelado desde distribución — stock y cuenta corriente revertidos" +
      (fallos.length ? ` — ATENCIÓN, fallaron: ${fallos.join("; ")}` : ""),
    user.id,
  );

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/pedidos/${orderId}`);
  if (order.customer_id) revalidatePath(`/admin/cuentas-corrientes/${order.customer_id}`);

  if (fallos.length)
    throw new Error(`El pedido se canceló, pero falló: ${fallos.join("; ")}. Revisá stock y cuenta corriente.`);
}

// Reprogramar el faltante de una entrega parcial: crea UN pedido nuevo, aprobado y enlazado, con lo que no
// se entregó (al precio original). Es una decisión del admin: el faltante queda cerrado por defecto.
// No hay cargo ni comisión hasta que el pedido nuevo se despache / entregue, por el flujo normal.
export async function crearPedidoConFaltante(
  orderId: string,
  fechaCompromiso: string,
): Promise<{ orderId: string; orderNumber: string } | { error: string }> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCompromiso)) return { error: "Fecha de compromiso inválida" };
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  if (fechaCompromiso < hoy) return { error: "La fecha de compromiso no puede ser anterior a hoy" };

  const { data: original } = await (supabase as any)
    .from("orders")
    .select("id, order_number, status, channel, customer_id, payment_method, delivery_zone_id, shipping_snapshot, delivered_snapshot")
    .eq("id", orderId)
    .single();
  if (!original) return { error: "Pedido no encontrado" };
  if (original.channel !== "b2b_mayorista" || !original.customer_id) return { error: "Solo se puede reprogramar el faltante de pedidos B2B" };
  if (!["entrega_parcial", "liquidado", "delivered"].includes(original.status) || !original.delivered_snapshot?.lineas)
    return { error: "El pedido no tiene una entrega parcial registrada" };

  const { data: yaReprogramado } = await (supabase as any)
    .from("orders")
    .select("order_number")
    .eq("origen_order_id", orderId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (yaReprogramado) return { error: `El faltante ya fue reprogramado en ${yaReprogramado.order_number}` };

  const { data: lineasOriginales } = await (supabase as any)
    .from("order_lines")
    .select("id, product_id, unit_price, product_snapshot")
    .eq("order_id", orderId);

  let faltante;
  try {
    faltante = calcularFaltante(original.delivered_snapshot.lineas, lineasOriginales ?? []);
  } catch (e: any) {
    return { error: e.message };
  }
  if (faltante.length === 0) return { error: "El pedido no tiene faltante" };

  const subtotal = Math.round(faltante.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const ahora = new Date().toISOString();

  const inserted = await insertarPedidoB2B(supabase, {
    channel:                 "b2b_mayorista",
    customer_id:             original.customer_id,
    status:                  "aprobado",
    aprobado_por:            user.id,
    aprobado_at:             ahora,
    subtotal,
    shipping_fee:            0,
    discount:                0,
    total:                   subtotal,
    cargo_adicional_monto:   0,
    ideia_commission_rate:   0.15,
    ideia_commission_amount: 0,
    shipping_method:         "b2b_despacho",
    payment_method:          original.payment_method,
    notes:                   `Faltante del pedido ${original.order_number}`,
    delivery_zone_id:        original.delivery_zone_id,
    shipping_snapshot:       original.shipping_snapshot,
    origen_order_id:         orderId,
    fecha_compromiso:        fechaCompromiso,
  });
  if ("error" in inserted) return { error: inserted.error };

  const { error: errLineas } = await (supabase as any).from("order_lines").insert(
    faltante.map((l) => ({
      order_id:         inserted.id,
      product_id:       l.productId,
      product_snapshot: l.productSnapshot,
      quantity:         l.quantity,
      unit_price:       l.unitPrice,
      line_total:       l.lineTotal,
    })),
  );
  if (errLineas) {
    await (supabase as any).from("orders").delete().eq("id", inserted.id);
    return { error: errLineas.message };
  }

  await logOrderEvent(supabase, inserted.id, "aprobado", `Creado como faltante del pedido ${original.order_number} — compromiso ${fechaCompromiso}`, user.id);
  await logOrderEvent(supabase, orderId, original.status, `Faltante reprogramado en ${inserted.orderNumber}`, user.id);

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath(`/admin/pedidos/${inserted.id}`);
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/alertas");
  return { orderId: inserted.id, orderNumber: inserted.orderNumber };
}

// ── Editar cantidades de un pedido ────────────────────────────────────────────
const ESTADOS_EDITABLES = ["aprobado", "enviado_prod"];

export async function editarCantidadesPedido(
  orderId: string,
  lines: { id: string; quantity: number }[],
): Promise<{ error: string } | { ok: true }> {
  const supabase  = await createClient();
  const db        = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") return { error: "No autorizado" };

  if (!lines.length) return { error: "No hay líneas para actualizar" };
  if (lines.some(l => l.quantity < 0)) return { error: "Las cantidades no pueden ser negativas" };

  // Verificar estado del pedido
  const { data: order } = await db
    .from("orders")
    .select("status, discount, shipping_fee")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Pedido no encontrado" };
  if (!ESTADOS_EDITABLES.includes(order.status))
    return { error: `Solo se pueden editar pedidos en estado: ${ESTADOS_EDITABLES.join(", ")}` };

  // Obtener precios actuales de las líneas
  const { data: currentLines } = await db
    .from("order_lines")
    .select("id, unit_price")
    .eq("order_id", orderId);

  if (!currentLines?.length) return { error: "No se encontraron líneas del pedido" };

  const priceMap: Record<string, number> = {};
  for (const l of currentLines) priceMap[l.id] = Number(l.unit_price);

  // Actualizar cada línea
  for (const line of lines) {
    const unitPrice = priceMap[line.id];
    if (unitPrice === undefined) return { error: `Línea ${line.id} no pertenece a este pedido` };
    const lineTotal = line.quantity * unitPrice;
    const { error } = await db
      .from("order_lines")
      .update({ quantity: line.quantity, line_total: lineTotal })
      .eq("id", line.id)
      .eq("order_id", orderId);
    if (error) return { error: error.message };
  }

  // Recalcular totales del pedido
  const { data: updatedLines } = await db
    .from("order_lines")
    .select("line_total")
    .eq("order_id", orderId);

  const subtotal = (updatedLines ?? []).reduce((s: number, l: any) => s + Number(l.line_total), 0);
  const total    = subtotal - Number(order.discount ?? 0) + Number(order.shipping_fee ?? 0);

  const { error: errOrder } = await db
    .from("orders")
    .update({ subtotal, total })
    .eq("id", orderId);
  if (errOrder) return { error: errOrder.message };

  await logOrderEvent(db, orderId, order.status, "Cantidades editadas manualmente", user.id);

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true };
}

export async function eliminarLineaPedido(
  orderId: string,
  lineId: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const db       = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") return { error: "No autorizado" };

  const { data: order } = await db
    .from("orders")
    .select("status, discount, shipping_fee")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Pedido no encontrado" };
  if (!ESTADOS_EDITABLES.includes(order.status))
    return { error: `Solo se pueden editar pedidos en estado: ${ESTADOS_EDITABLES.join(", ")}` };

  const { count } = await db
    .from("order_lines")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  if ((count ?? 0) <= 1) return { error: "El pedido debe tener al menos un producto" };

  const { error: delError } = await db
    .from("order_lines")
    .delete()
    .eq("id", lineId)
    .eq("order_id", orderId);
  if (delError) return { error: delError.message };

  const { data: updatedLines } = await db
    .from("order_lines")
    .select("line_total")
    .eq("order_id", orderId);
  const subtotal = (updatedLines ?? []).reduce((s: number, l: any) => s + Number(l.line_total), 0);
  const total    = subtotal - Number(order.discount ?? 0) + Number(order.shipping_fee ?? 0);

  const { error: errOrder } = await db
    .from("orders")
    .update({ subtotal, total })
    .eq("id", orderId);
  if (errOrder) return { error: errOrder.message };

  await logOrderEvent(db, orderId, order.status, "Línea eliminada del pedido", user.id);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true };
}

export async function agregarLineaPedido(
  orderId: string,
  productId: string,
  quantity: number,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const db       = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") return { error: "No autorizado" };

  if (quantity <= 0) return { error: "La cantidad debe ser mayor a 0" };

  const { data: order } = await db
    .from("orders")
    .select("status, discount, shipping_fee, customer_id, delivery_zone_id")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Pedido no encontrado" };
  if (!ESTADOS_EDITABLES.includes(order.status))
    return { error: `Solo se pueden editar pedidos en estado: ${ESTADOS_EDITABLES.join(", ")}` };

  const [productRes, profileRes, params, zonaRes] = await Promise.all([
    db.from("products")
      .select("id, name, sku, costo, bolsas_caja, pkg_unitario, pkg_bulto, u_bolsa, categoria, divisiones_display")
      .eq("id", productId)
      .single(),
    db.from("profiles")
      .select("comision_pct_override, canal:canales!canal_id (margen_std, margen_premium, markup_pvp)")
      .eq("id", order.customer_id)
      .single(),
    getParametros(),
    // Misma zona de entrega del pedido: la línea nueva lleva el mismo flete CIF que las demás
    order.delivery_zone_id
      ? db.from("delivery_zones").select("flete_pct").eq("id", order.delivery_zone_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const prod      = productRes.data;
  const canalData = profileRes.data?.canal;

  if (!prod)      return { error: "Producto no encontrado" };
  if (!prod.costo) return { error: "El producto no tiene costo configurado" };
  if (!canalData) return { error: "El cliente no tiene canal asignado" };

  const comisionPctCliente = profileRes.data?.comision_pct_override != null
    ? Number(profileRes.data.comision_pct_override)
    : params.comision_pct;

  const precio = calcularPrecio({
    costo:              Number(prod.costo),
    bolsas_caja:        Number(prod.bolsas_caja),
    pkg_unitario:       Number(prod.pkg_unitario ?? 0),
    pkg_bulto:          Number(prod.pkg_bulto    ?? 0),
    u_bolsa:            Number(prod.u_bolsa),
    categoria:          prod.categoria,
    divisiones_display: prod.divisiones_display ?? null,
    margen_std:         Number(canalData.margen_std),
    margen_premium:     Number(canalData.margen_premium),
    markup_pvp:         Number(canalData.markup_pvp),
    iva_pct:            params.iva_pct,
    comision_pct:       comisionPctCliente,
    flete_pct:          Number(zonaRes.data?.flete_pct ?? 0),
  });

  const unitPrice = precio.final_civa;
  const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

  const { error: insError } = await db
    .from("order_lines")
    .insert({
      order_id:         orderId,
      product_id:       productId,
      quantity,
      unit_price:       unitPrice,
      line_total:       lineTotal,
      product_snapshot: { name: prod.name, sku: prod.sku ?? null, precio: { flete: precio.flete } },
    });
  if (insError) return { error: insError.message };

  const { data: updatedLines } = await db
    .from("order_lines")
    .select("line_total")
    .eq("order_id", orderId);
  const subtotal = (updatedLines ?? []).reduce((s: number, l: any) => s + Number(l.line_total), 0);
  const total    = subtotal - Number(order.discount ?? 0) + Number(order.shipping_fee ?? 0);

  const { error: errOrder } = await db
    .from("orders")
    .update({ subtotal, total })
    .eq("id", orderId);
  if (errOrder) return { error: errOrder.message };

  await logOrderEvent(db, orderId, order.status, `Línea agregada: ${prod.name} (×${quantity})`, user.id);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true };
}
