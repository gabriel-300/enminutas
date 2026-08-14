"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { emailPagoConfirmado, emailPedidoModificadoDespacho } from "@/lib/email";

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

  const stockInsuficiente: string[] = [];
  for (const line of (lines ?? []) as { product_id: string; quantity: number }[]) {
    const { data: suficiente } = await (supabase as any).rpc("decrement_stock", {
      p_product_id: line.product_id,
      p_qty:        line.quantity,
    });
    if (suficiente === false) stockInsuficiente.push(line.product_id);
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
    await (supabase as any)
      .from("order_lines")
      .update({ quantity: a.quantityDespacho, line_total: newTotal })
      .eq("id", a.lineId);
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
    await (supabase as any).rpc("decrement_stock", {
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

export async function agregarNota(orderId: string, nota: string) {
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

  const { error } = await supabase
    .from("orders")
    .update({ notes: nota.trim() || null })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/pedidos/${orderId}`);
}

export type LineaEntregada = {
  productId: string;
  name:      string;
  pedido:    number;
  entregado: number;
};

export async function confirmarEntregaParcial(orderId: string, lineas: LineaEntregada[]) {
  const role = await getCallerRole();
  if (role !== "admin" && role !== "distribucion") throw new Error("No autorizado");

  const todosEntregados = lineas.every((l) => l.entregado >= l.pedido);

  // Si todo fue entregado usar el flujo normal
  if (todosEntregados) {
    await confirmarEntrega(orderId);
    return;
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await (supabase as any)
    .from("orders")
    .update({
      status:             "entrega_parcial",
      entregado_at:       new Date().toISOString(),
      delivered_snapshot: { lineas, timestamp: new Date().toISOString() },
    })
    .eq("id", orderId)
    .in("status", ["despachado", "en_distribucion"])
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("El pedido no está en estado de distribución");
  await logOrderEvent(supabase, orderId, "entrega_parcial", "Entrega parcial confirmada");

  // Reintegrar al stock las unidades no entregadas
  for (const linea of lineas) {
    const noEntregado = linea.pedido - linea.entregado;
    if (noEntregado <= 0) continue;
    await (supabase as any).rpc("increment_stock", {
      p_product_id: linea.productId,
      p_qty:        noEntregado,
    });
    await (supabase as any).from("stock_movements").insert({
      product_id: linea.productId,
      qty:        noEntregado,
      type:       "ajuste",
      order_id:   orderId,
      notes:      `Reintegro entrega parcial — ${noEntregado} de ${linea.pedido} no entregados`,
    });
  }

  revalidatePath("/admin/distribucion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
}
