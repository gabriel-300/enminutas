import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calcularPrecio } from "@/lib/b2b-pricing";
import { getParametros } from "@/lib/parametros";
import { getFreeLLMModels, orChat, type ORMessage } from "@/lib/openrouter";

const STAFF_ROLES = ["admin", "vendedor", "produccion", "distribucion"];

function buildSystemPrompt(role: string) {
  const base = `Sos el asistente interno de En Minutas, empresa distribuidora de alimentos congelados en Argentina (pizzas, tartas, empanadas, rebozados de mandioca).

## Estados de pedido
pending_payment → aprobado → enviado_prod → despachado → en_distribucion → delivered → liquidado
También: entrega_parcial (entrega incompleta).

## Precios B2B
Calculados dinámicamente: costo + márgenes canal + IVA 21% + comisión. Canales: dist (distribuidor), min (minorista), gastro (gastronomía). Precio s/IVA = precio_c_iva / 1.21.

## Reglas
- Respondé en español, de forma concisa (máx 6 líneas).
- Nunca inventes datos. Usá las herramientas para consultar información real.
- Si no podés responder con las herramientas disponibles, indicá en qué módulo del sistema se encuentra esa información.
- Pedidos B2B tienen número B2B-YYYY-NNNN. Muestras tienen MST-YYYY-NNNN.`;

  const byRole: Record<string, string> = {
    admin: `
Rol: Administrador — tenés acceso a todo el sistema.

Podés consultar: pedidos (todos los estados), clientes B2B, stock, pipeline de ventas, muestras, precios por canal y reportes.

Módulos disponibles:
- Pedidos: ciclo completo B2B, aprobación, despacho.
- Clientes B2B: alta, canal asignado, descuentos, historial de compras.
- Cocina: producción agrupada por producto, planificador, recetas, insumos, lotes de stock.
- Distribución: reparto, estado en tiempo real, despacho_info con repartidor/patente/fecha.
- Reportes: GMV, margen por canal, rentabilidad. Menú → Reportes.
- Liquidaciones: comisiones preventistas y liquidaciones IDEIA. Menú → Liquidaciones.
- Muestras (MST): productos de muestra sin costo. Menú → Comercial → Muestras.
- Pipeline: prospectos en etapas de conversión. Menú → Comercial → Pipeline.
- Recepciones: ingreso de mercadería con IVA, vencimiento y costo. Menú → Cocina → Recepciones.
- Cuentas corrientes, cheques, devoluciones: módulos administrativos.`,

    vendedor: `
Rol: Preventista/Vendedor.

Tu trabajo es crear pedidos, seguir clientes y manejar el pipeline de ventas.

Módulos que usás:
- Pedidos: creás desde Pedidos → Nuevo pedido. Elegís cliente, dirección y productos.
- Clientes B2B: podés buscar datos de contacto, canal y dirección.
- Pipeline: prospectos en etapas (contacto inicial → negociación → ganado/perdido). Menú → Comercial → Pipeline.
- Muestras: enviás productos de muestra. Menú → Comercial → Muestras.
- Log de contactos: registrás visitas y llamadas en el perfil del cliente.
- Precios: podés consultar precios por producto y canal.`,

    produccion: `
Rol: Producción/Cocina.

Tu trabajo es preparar los pedidos aprobados y gestionar el stock.

Módulos que usás:
- Cocina: pedidos en estado aprobado/enviado_prod agrupados por producto. Menú → Cocina.
- Planificador: producción programada por día.
- Stock / Lotes: el stock se registra en Cocina → "+ Registrar lote". Sin lotes = sin stock.
- Lista de compras: insumos necesarios calculados automáticamente.
- Recetas: ingredientes y pasos por producto.
- Recepciones: ingreso de mercadería con costo e IVA.`,

    distribucion: `
Rol: Distribución/Repartidor.

Tu trabajo es entregar los pedidos despachados.

Módulos que usás:
- Distribución: pedidos en estado despachado/en_distribucion. Menú → Distribución o App Repartidor.
- Al entregar: marcás delivered (o entrega_parcial si fue incompleta).
- Cada pedido tiene dirección de entrega, datos de contacto del cliente y notas.`,
  };

  return base + (byRole[role] ?? `\nRol actual: ${role}`);
}

// Tools disponibles según rol
function getToolsForRole(role: string) {
  const all = [
    {
      type: "function" as const,
      function: {
        name: "buscar_producto",
        description: "Busca un producto por nombre o código y devuelve precio calculado para un canal.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Nombre, parte del nombre o código numérico del producto" },
            canal: { type: "string", enum: ["dist", "min", "gastro"], description: "Canal de precio (default: dist)" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "consultar_pedido",
        description: "Detalle completo de un pedido por su número (B2B-YYYY-NNNN o MST-YYYY-NNNN).",
        parameters: {
          type: "object",
          properties: {
            numero: { type: "string", description: "Número del pedido, ej: B2B-2026-0042" },
          },
          required: ["numero"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "pedidos_activos",
        description: "Lista los pedidos activos del sistema, opcionalmente filtrados por estado.",
        parameters: {
          type: "object",
          properties: {
            estado: {
              type: "string",
              enum: ["aprobado", "enviado_prod", "despachado", "en_distribucion", "delivered"],
              description: "Estado a filtrar. Si se omite, devuelve todos los activos según el rol.",
            },
          },
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "buscar_cliente",
        description: "Busca un cliente B2B por nombre. Devuelve datos de contacto, canal, dirección y vendedor asignado.",
        parameters: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "Nombre o parte del nombre del cliente o empresa" },
          },
          required: ["nombre"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "pedidos_cliente",
        description: "Lista los últimos pedidos de un cliente B2B por nombre.",
        parameters: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "Nombre o parte del nombre del cliente" },
            limite: { type: "number", description: "Cantidad de pedidos a devolver (default 5, máx 10)" },
          },
          required: ["nombre"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "ver_stock",
        description: "Consulta el stock actual por producto. Devuelve lotes activos con cantidad disponible.",
        parameters: {
          type: "object",
          properties: {
            producto: { type: "string", description: "Nombre o parte del nombre del producto. Si se omite, devuelve resumen general." },
          },
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "ver_pipeline",
        description: "Lista los prospectos del pipeline de ventas, filtrable por estado.",
        parameters: {
          type: "object",
          properties: {
            estado: {
              type: "string",
              enum: ["contacto_inicial", "presentacion", "negociacion", "propuesta_enviada", "ganado", "perdido"],
              description: "Estado del pipeline a filtrar. Si se omite, devuelve todos los activos.",
            },
          },
        },
      },
    },
  ];

  // Producción solo necesita: buscar_producto, consultar_pedido, pedidos_activos, ver_stock
  if (role === "produccion") return all.filter(t => ["buscar_producto","consultar_pedido","pedidos_activos","ver_stock"].includes(t.function.name));
  // Distribución solo necesita: consultar_pedido, pedidos_activos
  if (role === "distribucion") return all.filter(t => ["consultar_pedido","pedidos_activos"].includes(t.function.name));
  // Vendedor: todo menos ver_pipeline propio (lo tiene igual)
  return all;
}

async function executeTool(name: string, rawArgs: string, role: string): Promise<unknown> {
  let args: Record<string, unknown>;
  try { args = JSON.parse(rawArgs); } catch { return { error: "Argumentos inválidos" }; }

  const db = createAdminClient() as any;

  // ── buscar_producto ──────────────────────────────────────────────────────
  if (name === "buscar_producto") {
    const query = String(args.query ?? "");
    const CANAL_NORM: Record<string, string> = {
      distribuidor: "dist", distribuidores: "dist",
      minorista: "min", minoristas: "min",
      gastronomia: "gastro", gastronomía: "gastro",
    };
    const rawCanal = String(args.canal ?? "dist").toLowerCase();
    const canal = CANAL_NORM[rawCanal] ?? rawCanal;
    const isCode = !isNaN(Number(query)) && query.trim() !== "";

    const { data: byName } = await db.from("products")
      .select("id, name, sku, codigo, presentacion, u_bolsa, bolsas_caja, costo, pkg_unitario, pkg_bulto, categoria, divisiones_display")
      .eq("is_active", true).ilike("name", `%${query}%`).limit(5);

    let extra: unknown[] = [];
    if (isCode) {
      const { data: byCode } = await db.from("products")
        .select("id, name, sku, codigo, presentacion, u_bolsa, bolsas_caja, costo, pkg_unitario, pkg_bulto, categoria, divisiones_display")
        .eq("is_active", true).eq("codigo", Number(query)).limit(3);
      extra = byCode ?? [];
    }

    const all: any[] = [...(byName ?? []), ...extra];
    const unique = all.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i).slice(0, 5);
    if (!unique.length) return { encontrado: false, mensaje: "No se encontraron productos." };

    const { data: canalData } = await db.from("canales").select("margen_std, margen_premium, markup_pvp").eq("slug", canal).single();
    const params = await getParametros();

    return unique.map((p: any) => {
      if (!p.costo || !canalData) return { nombre: p.name, codigo: p.codigo, precio: "Sin costo configurado" };
      const precio = calcularPrecio({
        costo: Number(p.costo), bolsas_caja: Number(p.bolsas_caja),
        pkg_unitario: Number(p.pkg_unitario ?? 0), pkg_bulto: Number(p.pkg_bulto ?? 0),
        u_bolsa: Number(p.u_bolsa), categoria: p.categoria,
        divisiones_display: p.divisiones_display ?? null,
        margen_std: Number(canalData.margen_std), margen_premium: Number(canalData.margen_premium),
        markup_pvp: Number(canalData.markup_pvp), iva_pct: params.iva_pct, comision_pct: params.comision_pct,
      });
      return {
        nombre: p.name, codigo: p.codigo, presentacion: p.presentacion, canal,
        precio_caja_civa: precio.final_civa, precio_caja_siva: precio.lista_siva,
        precio_por_unidad: precio.precio_unidad, bolsas_caja: p.bolsas_caja, u_por_bolsa: p.u_bolsa,
      };
    });
  }

  // ── consultar_pedido ─────────────────────────────────────────────────────
  if (name === "consultar_pedido") {
    const numero = String(args.numero ?? "").trim().toUpperCase();
    let q = db.from("orders")
      .select(`id, order_number, status, total, discount, created_at, notes, payment_method,
        muestra_destinatario, despacho_info,
        customer:profiles!customer_id(full_name, phone, canal),
        lines:order_lines(quantity, unit_price, product_snapshot)`)
      .eq("order_number", numero);
    if (role === "produccion") q = q.in("status", ["aprobado", "enviado_prod", "despachado"]);
    else if (role === "distribucion") q = q.in("status", ["despachado", "en_distribucion", "delivered", "entrega_parcial"]);
    const { data } = await q.maybeSingle();
    if (!data) return { encontrado: false, mensaje: `Pedido ${numero} no encontrado o sin acceso.` };
    const isMuestra = numero.startsWith("MST");
    return {
      numero: data.order_number, tipo: isMuestra ? "muestra" : "pedido B2B",
      estado: data.status, cliente: (data.customer as any)?.full_name ?? (data.muestra_destinatario ?? "—"),
      telefono: (data.customer as any)?.phone ?? null,
      canal: (data.customer as any)?.canal ?? null,
      total: isMuestra ? "sin costo" : data.total,
      descuento: data.discount, forma_pago: data.payment_method,
      fecha: new Date(data.created_at).toLocaleDateString("es-AR"),
      notas: data.notes ?? null,
      despacho: data.despacho_info ?? null,
      items: ((data.lines ?? []) as any[]).map((l: any) => ({
        producto: l.product_snapshot?.name ?? "—",
        cantidad: l.quantity, precio_u: isMuestra ? 0 : l.unit_price,
        subtotal: isMuestra ? 0 : l.unit_price * l.quantity,
      })),
    };
  }

  // ── pedidos_activos ──────────────────────────────────────────────────────
  if (name === "pedidos_activos") {
    const estadoArg = args.estado as string | undefined;
    const ESTADOS_POR_ROL: Record<string, string[]> = {
      admin:       ["aprobado", "enviado_prod", "despachado", "en_distribucion"],
      vendedor:    ["aprobado", "enviado_prod", "despachado", "en_distribucion"],
      produccion:  ["aprobado", "enviado_prod"],
      distribucion:["despachado", "en_distribucion"],
    };
    const allowed  = ESTADOS_POR_ROL[role] ?? ESTADOS_POR_ROL.admin;
    const statuses = estadoArg && allowed.includes(estadoArg) ? [estadoArg] : allowed;
    const { data } = await db.from("orders")
      .select("order_number, status, total, created_at, customer:profiles!customer_id(full_name)")
      .in("status", statuses).order("created_at", { ascending: false }).limit(10);
    if (!data?.length) return { encontrado: false, mensaje: "No hay pedidos activos." };
    return (data as any[]).map((o: any) => ({
      numero: o.order_number, estado: o.status,
      cliente: (o.customer as any)?.full_name ?? "—",
      total: o.total, fecha: new Date(o.created_at).toLocaleDateString("es-AR"),
    }));
  }

  // ── buscar_cliente ───────────────────────────────────────────────────────
  if (name === "buscar_cliente") {
    const nombre = String(args.nombre ?? "").trim();
    const { data } = await db.from("profiles")
      .select("full_name, phone, canal, b2b_status, direccion_calle, direccion_numero, direccion_ciudad, notas_internas, vendedor:profiles!vendedor_id(full_name)")
      .ilike("full_name", `%${nombre}%`)
      .not("canal", "is", null)
      .limit(5);
    if (!data?.length) return { encontrado: false, mensaje: `No se encontraron clientes con nombre "${nombre}".` };
    return (data as any[]).map((c: any) => ({
      nombre: c.full_name, telefono: c.phone ?? "—", canal: c.canal,
      estado: c.b2b_status ?? "activo",
      direccion: [c.direccion_calle, c.direccion_numero, c.direccion_ciudad].filter(Boolean).join(" ") || "—",
      vendedor_asignado: (c.vendedor as any)?.full_name ?? "—",
      notas: c.notas_internas ?? null,
    }));
  }

  // ── pedidos_cliente ──────────────────────────────────────────────────────
  if (name === "pedidos_cliente") {
    const nombre = String(args.nombre ?? "").trim();
    const limite = Math.min(Number(args.limite ?? 5), 10);
    const { data: clientes } = await db.from("profiles")
      .select("id, full_name").ilike("full_name", `%${nombre}%`).not("canal", "is", null).limit(3);
    if (!clientes?.length) return { encontrado: false, mensaje: `No se encontró cliente "${nombre}".` };
    const ids = (clientes as any[]).map((c: any) => c.id);
    const { data } = await db.from("orders")
      .select("order_number, status, total, created_at, customer:profiles!customer_id(full_name)")
      .in("customer_id", ids).order("created_at", { ascending: false }).limit(limite);
    if (!data?.length) return { encontrado: false, mensaje: `No hay pedidos registrados para "${nombre}".` };
    return {
      cliente: (clientes as any[])[0].full_name,
      pedidos: (data as any[]).map((o: any) => ({
        numero: o.order_number, estado: o.status,
        total: o.total, fecha: new Date(o.created_at).toLocaleDateString("es-AR"),
      })),
    };
  }

  // ── ver_stock ────────────────────────────────────────────────────────────
  if (name === "ver_stock") {
    const prod = String(args.producto ?? "").trim();
    let q = db.from("lotes")
      .select("numero_lote, cantidad_actual, unidad, fecha_vencimiento, producto:products!producto_id(name, codigo)")
      .eq("activo", true).gt("cantidad_actual", 0).order("fecha_vencimiento", { ascending: true });
    if (prod) q = q.ilike("products.name", `%${prod}%`);
    const { data } = await q.limit(20);
    if (!data?.length) return { stock: "sin_stock", mensaje: prod ? `Sin stock para "${prod}".` : "No hay lotes activos con stock." };
    // Agrupar por producto
    const agrupado: Record<string, { total: number; unidad: string; lotes: number; proximo_vto: string }> = {};
    for (const l of data as any[]) {
      const key = (l.producto as any)?.name ?? "Desconocido";
      if (!agrupado[key]) agrupado[key] = { total: 0, unidad: l.unidad, lotes: 0, proximo_vto: l.fecha_vencimiento };
      agrupado[key].total += Number(l.cantidad_actual);
      agrupado[key].lotes++;
    }
    return Object.entries(agrupado).map(([producto, d]) => ({ producto, ...d }));
  }

  // ── ver_pipeline ─────────────────────────────────────────────────────────
  if (name === "ver_pipeline") {
    const estadoArg = args.estado as string | undefined;
    const ACTIVOS = ["contacto_inicial", "presentacion", "negociacion", "propuesta_enviada"];
    let q = db.from("pipeline_prospectos")
      .select("empresa, contacto_nombre, contacto_telefono, canal_objetivo, estado, valor_estimado, fecha_proximo_contacto, zona")
      .order("fecha_proximo_contacto", { ascending: true }).limit(15);
    if (estadoArg) q = q.eq("estado", estadoArg);
    else q = q.in("estado", ACTIVOS);
    // Vendedor solo ve sus propios prospectos — no implementamos filtro por vendedor_id aquí
    // porque no tenemos el user_id del staff en este contexto
    const { data } = await q;
    if (!data?.length) return { encontrado: false, mensaje: "No hay prospectos en el pipeline." };
    return (data as any[]).map((p: any) => ({
      empresa: p.empresa, contacto: p.contacto_nombre, telefono: p.contacto_telefono,
      canal_objetivo: p.canal_objetivo, estado: p.estado,
      valor_estimado: p.valor_estimado ?? null,
      proximo_contacto: p.fecha_proximo_contacto ?? null,
      zona: p.zona ?? null,
    }));
  }

  return { error: `Tool desconocida: ${name}` };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const role = (user.app_metadata?.role as string) ?? "";
  if (!STAFF_ROLES.includes(role)) return Response.json({ error: "No autorizado" }, { status: 401 });

  let body: { messages?: Array<{ role: string; content: string }> };
  try { body = await req.json(); } catch { return Response.json({ error: "Payload inválido" }, { status: 400 }); }

  const history  = (body.messages ?? []).slice(-20);
  const models   = await getFreeLLMModels();
  const system   = buildSystemPrompt(role);
  const TOOLS    = getToolsForRole(role);

  const msgs: ORMessage[] = [
    { role: "system", content: system },
    ...(history as ORMessage[]),
  ];

  let modelIdx = 0;

  for (let i = 0; i < 5; i++) {
    let resp;
    try {
      resp = await orChat(models[modelIdx], msgs, TOOLS);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const retriable = detail.includes("429") || detail.includes("403") || detail.includes("404")
        || detail.includes("503") || detail.includes("502") || detail.includes("overloaded");
      if (retriable && modelIdx < models.length - 1) { modelIdx++; i--; continue; }
      console.error("OpenRouter error:", detail);
      return Response.json({ error: "El asistente no está disponible. Intentá de nuevo en unos segundos." }, { status: 502 });
    }

    const msg = resp.choices[0]?.message;
    if (!msg) break;
    if (!msg.tool_calls?.length) return Response.json({ reply: msg.content ?? "" });

    msgs.push({ role: "assistant", content: null, tool_calls: msg.tool_calls } as any);
    for (const tc of msg.tool_calls) {
      const result = await executeTool(tc.function.name, tc.function.arguments, role);
      msgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }

  return Response.json({ reply: "No pude procesar la consulta. Intentá reformularla." });
}
