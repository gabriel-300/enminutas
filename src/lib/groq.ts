// Lectura de facturas/remitos argentinos por foto usando la API de Groq,
// con JSON mode nativo (response_format: json_schema) para forzar la forma
// de salida en vez de parsear texto libre después.
//
// Portado desde el proyecto kioscos-ideia (mismo enfoque probado en
// producción ahí) para la recepción de mercadería de En Minutas.
//
// Groq marca sus modelos de visión como "preview"/experimental -- esto
// alimenta datos contables reales (montos, CUIT), así que NO se confía
// ciegamente en el resultado: validarComprobante() devuelve advertencias de
// consistencia que hay que revisar antes de dar por buena una lectura, y
// loguearComprobanteInconsistente() deja rastro server-side de los casos con
// advertencias o parseo fallido.
//
// qwen/qwen3.6-27b (el modelo original portado de kioscos-ideia) dejó de
// existir en la cuenta ("model_not_found", confirmado en producción
// 2026-09-16) -- Groq lo renombró/movió a qwen/qwen3.8-27b, que sí acepta
// imágenes (confirmado con una request de prueba real). Si esto vuelve a
// romperse, revisar GET /openai/v1/models con la API key para ver qué
// modelos de visión quedan activos.
const MODELO_VISION = "qwen/qwen3.8-27b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Si Groq falla (modelo caído, 503 por sobrecarga, etc.) se prueba en orden
// con modelos gratuitos de visión de OpenRouter (ya configurado en el
// proyecto para el chat, ver lib/openrouter.ts) antes de rendirse. Estos no
// tienen JSON mode forzado en todos los proveedores, así que se le pide el
// JSON por prompt y se limpia igual que con Groq (limpiarRespuesta). Lista
// de modelos gratis con soporte de imagen: GET openrouter.ai/api/v1/models
// y filtrar por architecture.input_modalities incluyendo "image" y
// pricing.prompt === "0".
const MODELOS_FALLBACK_OPENROUTER = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Códigos de error transitorios (sobrecarga temporal, rate limit) -- vale la
// pena reintentar antes de pasar al siguiente modelo/proveedor.
const HTTP_REINTENTABLE = new Set([429, 500, 502, 503, 504]);

export type ItemComprobante = {
  descripcion:     string;
  cantidad:        number;
  precio_unitario: number;
};

export type ComprobanteLeido = {
  proveedor:          string | null;
  cuit:               string | null;
  fecha:              string | null; // YYYY-MM-DD si se pudo interpretar, sino como está escrita
  numero_comprobante: string | null;
  items:              ItemComprobante[];
  subtotal:           number | null;
  iva:                number | null;
  total:              number | null;
  motor:              string; // ej. "groq:qwen/qwen3.8-27b" u "openrouter:google/gemma-4-31b-it:free"
};

const JSON_SCHEMA = {
  type: "object",
  properties: {
    proveedor:          { type: ["string", "null"] },
    cuit:               { type: ["string", "null"] },
    fecha:              { type: ["string", "null"] },
    numero_comprobante: { type: ["string", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          descripcion:     { type: "string" },
          cantidad:        { type: "number" },
          precio_unitario: { type: "number" },
        },
        required: ["descripcion", "cantidad", "precio_unitario"],
      },
    },
    subtotal: { type: ["number", "null"] },
    iva:      { type: ["number", "null"] },
    total:    { type: ["number", "null"] },
  },
  required: ["proveedor", "cuit", "fecha", "numero_comprobante", "items", "subtotal", "iva", "total"],
} as const;

const SYSTEM_PROMPT =
  "Sos un asistente que lee facturas y remitos argentinos de insumos/mercadería a partir de una foto y extrae sus datos estructurados con precisión.";

const USER_PROMPT = `Extraé de esta factura o remito:
- "proveedor": razón social o nombre del emisor
- "cuit": CUIT del emisor, formato XX-XXXXXXXX-X si se puede leer, sino null
- "fecha": fecha de emisión en formato YYYY-MM-DD si se puede interpretar, sino tal cual está escrita, sino null
- "numero_comprobante": número de factura/remito (ej. "0001-00012345")
- "items": todas las líneas de productos/insumos, con "descripcion" (texto tal cual figura), "cantidad" y "precio_unitario" (precio UNITARIO neto de esa línea, no el subtotal de la línea ni el total del comprobante)
- "subtotal": subtotal antes de impuestos, si figura
- "iva": monto de IVA, si figura
- "total": total del comprobante

Si no podés leer con claridad algún dato de cabecera, usá null. Los items siempre van con tu mejor estimación, pero no inventes líneas que no existen en la foto.`;

// Para los fallbacks de OpenRouter, que no todos soportan json_schema
// forzado -- se lo pedimos explícito por prompt además del schema (por si
// alguno sí lo respeta) y se limpia la respuesta igual que con Groq.
const USER_PROMPT_JSON_ONLY = `${USER_PROMPT}

Respondé ÚNICAMENTE con el JSON pedido, sin texto adicional antes ni después, sin bloques de código markdown.`;

class ErrorLecturaVision extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function pedirLecturaGroq(model: string, imageBase64: string, mimeType: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no está configurada");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
      // Sin esto, los modelos qwen de Groq anteponen un bloque
      // <think>...</think> de razonamiento libre antes del JSON -- en el
      // tier gratuito (límite de tokens/minuto) eso puede hacer que el
      // pedido rebote antes de mandar un solo token de la imagen. Con el
      // modo thinking apagado no hay bloque que proteger.
      reasoning_effort: "none",
      response_format: {
        type: "json_schema",
        json_schema: { name: "comprobante_argentino", schema: JSON_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new ErrorLecturaVision(`Groq (${model}) respondió ${res.status}: ${detalle.slice(0, 300)}`, res.status);
  }

  const data = await res.json();
  const raw: string | undefined = data?.choices?.[0]?.message?.content;
  if (!raw) throw new ErrorLecturaVision(`Groq (${model}) no devolvió ningún texto legible`);

  return raw;
}

// Fallback cuando Groq no responde -- mismo prompt, pero sin json_schema
// forzado (no todos los proveedores detrás de OpenRouter lo soportan), así
// que se lo pedimos por texto y se limpia la respuesta con limpiarRespuesta.
async function pedirLecturaOpenRouter(model: string, imageBase64: string, mimeType: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no está configurada");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer":  "https://enminutas.com.ar",
      "X-Title":       "En Minutas Admin",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT_JSON_ONLY },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new ErrorLecturaVision(`OpenRouter (${model}) respondió ${res.status}: ${detalle.slice(0, 300)}`, res.status);
  }

  const data = await res.json();
  if (data?.error) {
    throw new ErrorLecturaVision(`OpenRouter (${model}): ${data.error.message ?? "error desconocido"}`, data.error.code);
  }
  const raw: string | undefined = data?.choices?.[0]?.message?.content;
  if (!raw) throw new ErrorLecturaVision(`OpenRouter (${model}) no devolvió ningún texto legible`);

  return raw;
}

// Reintenta la misma llamada con backoff simple solo ante errores
// transitorios (rate limit / sobrecarga) -- si no es transitorio, corta al
// toque para poder pasar al siguiente modelo/proveedor sin perder tiempo.
async function conReintento<T>(fn: () => Promise<T>, intentos = 2): Promise<T> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimoError = e;
      const status = e instanceof ErrorLecturaVision ? e.status : undefined;
      const reintentable = status != null && HTTP_REINTENTABLE.has(status);
      if (!reintentable || i === intentos - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw ultimoError;
}

// El modo "thinking" de algunos modelos (los qwen de Groq, algunos de los
// fallbacks de OpenRouter) puede anteponer un bloque de razonamiento antes
// del JSON, o envolver todo en un bloque de código -- se descarta si
// aparece, mismo criterio defensivo que usa openrouter.ts con las marcas de
// código ```json.
function limpiarRespuesta(raw: string): string {
  const sinThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const sinMarkdown = sinThink.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return sinMarkdown || sinThink || raw;
}

// 2048: de sobra para el JSON de un remito real (una línea por producto
// ronda 20-25 tokens), dejando margen bajo el límite de tokens/minuto del
// tier gratuito para la imagen + el prompt.
const MAX_TOKENS_LECTURA = 2048;

export async function leerComprobanteConGroq(imageBase64: string, mimeType: string): Promise<ComprobanteLeido> {
  const errores: string[] = [];

  try {
    const raw = await conReintento(() => pedirLecturaGroq(MODELO_VISION, imageBase64, mimeType, MAX_TOKENS_LECTURA));
    return { ...normalizarComprobante(parsearJson(limpiarRespuesta(raw), `groq-${MODELO_VISION}`)), motor: `groq:${MODELO_VISION}` };
  } catch (error) {
    const msg = (error as Error).message;
    errores.push(`Groq: ${msg}`);
    loguearComprobanteInconsistente({ etapa: "groq_fallo", detalle: msg });
  }

  // Groq no respondió -- probar en orden los modelos gratuitos de visión de
  // OpenRouter antes de rendirse del todo.
  for (const modelo of MODELOS_FALLBACK_OPENROUTER) {
    try {
      const raw = await conReintento(() => pedirLecturaOpenRouter(modelo, imageBase64, mimeType, MAX_TOKENS_LECTURA), 1);
      return { ...normalizarComprobante(parsearJson(limpiarRespuesta(raw), `openrouter-${modelo}`)), motor: `openrouter:${modelo}` };
    } catch (error) {
      const msg = (error as Error).message;
      errores.push(`OpenRouter ${modelo}: ${msg}`);
      loguearComprobanteInconsistente({ etapa: `openrouter_fallo_${modelo}`, detalle: msg });
    }
  }

  throw new Error(`No se pudo leer la foto con ningún modelo disponible -- cargá el comprobante a mano. (${errores.join(" · ")})`);
}

function parsearJson(raw: string, motor: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    loguearComprobanteInconsistente({ etapa: `parseo_json_${motor}`, detalle: raw.slice(0, 500) });
    throw new Error("No se pudo interpretar lo que leyó la foto");
  }
}

function normalizarComprobante(raw: unknown): Omit<ComprobanteLeido, "motor"> {
  const r = (raw ?? {}) as Record<string, unknown>;

  const items: ItemComprobante[] = Array.isArray(r.items)
    ? (r.items as unknown[])
        .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
        .filter((i) =>
          typeof i.descripcion === "string" &&
          typeof i.cantidad === "number" &&
          typeof i.precio_unitario === "number"
        )
        .map((i) => ({
          descripcion:     i.descripcion as string,
          cantidad:        i.cantidad as number,
          precio_unitario: i.precio_unitario as number,
        }))
    : [];

  return {
    proveedor:          typeof r.proveedor === "string" ? r.proveedor : null,
    cuit:               typeof r.cuit === "string" ? r.cuit : null,
    fecha:              typeof r.fecha === "string" ? r.fecha : null,
    numero_comprobante: typeof r.numero_comprobante === "string" ? r.numero_comprobante : null,
    items,
    subtotal: typeof r.subtotal === "number" ? r.subtotal : null,
    iva:      typeof r.iva === "number" ? r.iva : null,
    total:    typeof r.total === "number" ? r.total : null,
  };
}

// Validaciones de consistencia -- no bloquean el resultado, pero marcan
// advertencias para decidir si conviene revisar a mano antes de guardar.
export function validarComprobante(datos: ComprobanteLeido): string[] {
  const advertencias: string[] = [];

  if (datos.items.length === 0) {
    advertencias.push("No se leyó ninguna línea de producto");
  }

  if (!datos.cuit) {
    advertencias.push("No se pudo leer el CUIT");
  } else if (!/^\d{2}-?\d{8}-?\d{1}$/.test(datos.cuit.replace(/\s/g, ""))) {
    advertencias.push(`El CUIT leído no tiene un formato válido: "${datos.cuit}"`);
  }

  if (!datos.total) {
    advertencias.push("No se pudo leer el total del comprobante");
  }

  const sumaItems = datos.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  if (datos.items.length > 0 && datos.subtotal != null) {
    const tolerancia = Math.max(1, datos.subtotal * 0.02);
    if (Math.abs(sumaItems - datos.subtotal) > tolerancia) {
      advertencias.push(
        `La suma de los ítems (${sumaItems.toFixed(2)}) no coincide con el subtotal leído (${datos.subtotal.toFixed(2)})`
      );
    }
  }

  if (datos.subtotal != null && datos.iva != null && datos.total != null) {
    const totalCalculado = datos.subtotal + datos.iva;
    const tolerancia     = Math.max(1, datos.total * 0.02);
    if (Math.abs(totalCalculado - datos.total) > tolerancia) {
      advertencias.push(
        `Subtotal + IVA (${totalCalculado.toFixed(2)}) no coincide con el total leído (${datos.total.toFixed(2)})`
      );
    }
  }

  return advertencias;
}

// Deja rastro en los logs (visible en Vercel) de una lectura que falló o
// quedó con advertencias -- sirve para juntar una muestra real y medir la
// tasa de error antes de confiar en el pipeline sin revisión humana.
export function loguearComprobanteInconsistente(info: { etapa: string; detalle: string; advertencias?: string[] }) {
  console.error("[groq-comprobante] lectura inconsistente", {
    etapa:        info.etapa,
    advertencias: info.advertencias ?? [],
    detalle:      info.detalle,
    timestamp:    new Date().toISOString(),
  });
}
