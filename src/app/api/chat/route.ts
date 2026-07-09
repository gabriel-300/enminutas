import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import { getFreeLLMModels, orChat, type ORMessage } from "@/lib/openrouter";

const STAFF_ROLES = ["admin", "vendedor", "produccion", "distribucion"];

const ROLE_LABELS: Record<string, string> = {
  admin:       "administrador",
  vendedor:    "preventista/vendedor",
  produccion:  "producción",
  distribucion:"distribución",
};

function buildSystemPrompt(role: string) {
  return `Sos el asistente interno de En Minutas, empresa distribuidora de alimentos congelados en Argentina (pizzas, tartas, empanadas).

Rol actual: ${ROLE_LABELS[role] ?? role}

## Módulos del sistema

Pedidos (B2B-YYYY-NNNN): Ciclo completo de órdenes de compra B2B. Se crean desde Pedidos → Nuevo pedido. El preventista elige cliente, dirección y productos; los precios se calculan automáticamente por canal.

Muestras (MST-YYYY-NNNN): Pedidos internos sin costo para enviar productos de muestra a clientes potenciales. Se crean desde Comercial → Muestras → Nueva muestra. Flujo: aprobado → enviado_prod → despachado. El stock se descuenta igual que un pedido normal.

Preventista / Pipeline: Gestión de visitas y seguimiento de clientes potenciales. Log de contactos con fecha, tipo y notas. Pipeline muestra en qué etapa de conversión está cada cliente.

Cocina: Vista del equipo de producción. Muestra los pedidos aprobados/en_prod agrupados por producto, indicando cuántas unidades preparar. Subpáginas: Planificador (producción por día), Lista de compras (insumos), Historial de producción, Recetas.

Stock / Lotes: El stock real proviene de los lotes de producción registrados en Cocina → "+ Registrar". Sin lotes registrados, el stock aparece como "Sin stock". Al despachar un pedido el sistema descuenta unidades automáticamente. Se puede ver el detalle en Cocina → Stock y el historial en Cocina → Lotes.

Distribución: Vista para el repartidor. Muestra pedidos en estado "despachado" y "en_distribucion". El repartidor actualiza el estado al entregar. Si la entrega fue parcial se usa "entrega_parcial".

Reportes / Rentabilidad: Análisis de ventas, GMV y margen por canal. Solo para administradores.

Liquidaciones: Cálculo de comisiones para preventistas y liquidaciones IDEIA. Solo admin.

Facturación / Cuentas corrientes / Devoluciones / Cheques: Módulos administrativos, algunos en desarrollo.

## Estados de un pedido (en orden)
pending_payment → aprobado → enviado_prod → despachado → en_distribucion → delivered → liquidado
También existe: entrega_parcial (entrega incompleta).

## Precios B2B
Calculados dinámicamente: costo + márgenes del canal + IVA (21%) + comisión. El campo "precio_lista" es legacy. Canales:
- dist (distribuidor): margen más alto, clientes que revenden
- min (minorista): margen intermedio, comercios
- gastro (gastronomía): precio para restaurantes/pizzerías
Los precios incluyen IVA. Precio s/IVA = precio_c_iva / 1.21 (para Factura A).

## Reglas
- Respondé en español, de forma concisa (máx 5 líneas).
- Nunca inventes datos. Usá las herramientas para consultar información real.
- Si no podés consultar algo con las herramientas, explicá en qué módulo puede encontrarse la información.
- Si algo no existe o está en desarrollo, decilo claramente.`;
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "buscar_producto",
      description: "Busca un producto por nombre, código o SKU y devuelve su precio calculado para un canal.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nombre, parte del nombre, código numérico o SKU del producto" },
          canal: {
            type: "string",
            enum: ["dist", "min", "gastro"],
            description: "Canal de precio: dist=distribuidor (default), min=minorista, gastro=gastronomía",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_pedido",
      description: "Obtiene el detalle completo de un pedido por su número (ej: B2B-2025-0001).",
      parameters: {
        type: "object",
        properties: {
          numero: { type: "string", description: "Número del pedido, ej: B2B-2025-0001" },
        },
        required: ["numero"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "pedidos_activos",
      description: "Lista pedidos activos en el sistema, filtrados por estado si se indica.",
      parameters: {
        type: "object",
        properties: {
          estado: {
            type: "string",
            enum: ["aprobado", "enviado_prod", "despachado", "en_distribucion", "delivered"],
            description: "Estado a filtrar. Si se omite, devuelve todos los estados activos según el rol.",
          },
        },
      },
    },
  },
];

async function executeTool(
  name: string,
  rawArgs: string,
  role: string,
): Promise<unknown> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return { error: "Argumentos inválidos" };
  }

  const db = createAdminClient() as any;

  if (name === "buscar_producto") {
    const query  = String(args.query ?? "");
    const CANAL_NORM: Record<string, string> = {
      distribuidor: "dist", distribuidores: "dist",
      minorista: "min", minoristas: "min",
      gastronomia: "gastro", gastronomía: "gastro", gastronomico: "gastro",
    };
    const rawCanal = String(args.canal ?? "dist").toLowerCase();
    const canal = CANAL_NORM[rawCanal] ?? rawCanal;

    const isCode = !isNaN(Number(query)) && query.trim() !== "";
    const { data: products } = await db
      .from("products")
      .select("id, name, sku, codigo, presentacion, u_bolsa, bolsas_caja, costo, pkg_unitario, pkg_bulto, categoria, divisiones_display")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(isCode ? 1 : 5);

    // También intentar por código si es numérico
    let extra: unknown[] = [];
    if (isCode) {
      const { data: byCode } = await db
        .from("products")
        .select("id, name, sku, codigo, presentacion, u_bolsa, bolsas_caja, costo, pkg_unitario, pkg_bulto, categoria, divisiones_display")
        .eq("is_active", true)
        .eq("codigo", Number(query))
        .limit(3);
      extra = byCode ?? [];
    }

    const all: any[] = [...(products ?? []), ...extra];
    const unique = all.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i).slice(0, 5);

    if (!unique.length) return { encontrado: false, mensaje: "No se encontraron productos con ese nombre o código." };

    const { data: canalData } = await db.from("canales").select("margen_std, margen_premium, markup_pvp").eq("slug", canal).single();
    const params = await getParametros();

    return unique.map((p: any) => {
      if (!p.costo || !canalData) return { nombre: p.name, precio: "Sin costo configurado" };

      const precio = calcularPrecio({
        costo:              Number(p.costo),
        bolsas_caja:        Number(p.bolsas_caja),
        pkg_unitario:       Number(p.pkg_unitario ?? 0),
        pkg_bulto:          Number(p.pkg_bulto    ?? 0),
        u_bolsa:            Number(p.u_bolsa),
        categoria:          p.categoria,
        divisiones_display: p.divisiones_display ?? null,
        margen_std:         Number(canalData.margen_std),
        margen_premium:     Number(canalData.margen_premium),
        markup_pvp:         Number(canalData.markup_pvp),
        iva_pct:            params.iva_pct,
        comision_pct:       params.comision_pct,
      });

      return {
        nombre:          p.name,
        codigo:          p.codigo,
        presentacion:    p.presentacion,
        canal,
        precio_caja_civa:  precio.final_civa,
        precio_caja_siva:  precio.lista_siva,
        precio_por_unidad: precio.precio_unidad,
        bolsas_caja:       p.bolsas_caja,
        u_por_bolsa:       p.u_bolsa,
      };
    });
  }

  if (name === "consultar_pedido") {
    const numero = String(args.numero ?? "").trim().toUpperCase();

    let q = db
      .from("orders")
      .select(`id, order_number, status, total, discount, created_at, notes, payment_method,
        customer:profiles!customer_id(full_name),
        lines:order_lines(quantity, unit_price, product_snapshot)`)
      .eq("order_number", numero);

    // Restricciones por rol
    if (role === "produccion") {
      q = q.in("status", ["aprobado", "enviado_prod", "despachado"]);
    } else if (role === "distribucion") {
      q = q.in("status", ["despachado", "en_distribucion", "delivered"]);
    }

    const { data } = await q.maybeSingle();
    if (!data) return { encontrado: false, mensaje: `Pedido ${numero} no encontrado o sin acceso.` };

    return {
      numero:         data.order_number,
      estado:         data.status,
      cliente:        (data.customer as any)?.full_name ?? "—",
      total:          data.total,
      descuento:      data.discount,
      forma_pago:     data.payment_method,
      fecha:          new Date(data.created_at).toLocaleDateString("es-AR"),
      notas:          data.notes ?? null,
      items:          ((data.lines ?? []) as any[]).map((l: any) => ({
        producto:   l.product_snapshot?.name ?? "—",
        cantidad:   l.quantity,
        precio_u:   l.unit_price,
        subtotal:   l.unit_price * l.quantity,
      })),
    };
  }

  if (name === "pedidos_activos") {
    const estadoArg = args.estado as string | undefined;

    const ESTADOS_POR_ROL: Record<string, string[]> = {
      admin:       ["aprobado", "enviado_prod", "despachado", "en_distribucion"],
      vendedor:    ["aprobado", "enviado_prod", "despachado", "en_distribucion"],
      produccion:  ["aprobado", "enviado_prod"],
      distribucion:["despachado", "en_distribucion"],
    };

    const allowed   = ESTADOS_POR_ROL[role] ?? ESTADOS_POR_ROL.admin;
    const statuses  = estadoArg && allowed.includes(estadoArg) ? [estadoArg] : allowed;

    const { data } = await db
      .from("orders")
      .select("order_number, status, total, created_at, customer:profiles!customer_id(full_name)")
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data?.length) return { encontrado: false, mensaje: "No hay pedidos activos en este momento." };

    return (data as any[]).map((o: any) => ({
      numero:  o.order_number,
      estado:  o.status,
      cliente: (o.customer as any)?.full_name ?? "—",
      total:   o.total,
      fecha:   new Date(o.created_at).toLocaleDateString("es-AR"),
    }));
  }

  return { error: `Tool desconocida: ${name}` };
}

export async function POST(req: Request) {
  // Autenticar
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const role = (user.app_metadata?.role as string) ?? "";
  if (!STAFF_ROLES.includes(role)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Payload inválido" }, { status: 400 });
  }

  const history = (body.messages ?? []).slice(-20); // máx 20 turnos de contexto

  const models  = await getFreeLLMModels();
  const system  = buildSystemPrompt(role);

  const msgs: ORMessage[] = [
    { role: "system", content: system },
    ...(history as ORMessage[]),
  ];

  let modelIdx = 0;

  // Loop agéntico (máx 4 iteraciones para evitar bucles)
  for (let i = 0; i < 4; i++) {
    let resp;
    try {
      resp = await orChat(models[modelIdx], msgs, TOOLS);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      if (detail.includes("429") && modelIdx < models.length - 1) {
        modelIdx++;
        i--; // reintentar misma iteración con el siguiente modelo
        continue;
      }
      console.error("OpenRouter error:", detail);
      return Response.json({ error: `Error al conectar con el asistente: ${detail}` }, { status: 502 });
    }

    const msg = resp.choices[0]?.message;
    if (!msg) break;

    if (!msg.tool_calls?.length) {
      return Response.json({ reply: msg.content ?? "" });
    }

    // Ejecutar tools
    msgs.push({ role: "assistant", content: null, tool_calls: msg.tool_calls } as any);

    for (const tc of msg.tool_calls) {
      const result = await executeTool(tc.function.name, tc.function.arguments, role);
      msgs.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return Response.json({ reply: "No pude procesar la consulta. Intentá reformularla." });
}
