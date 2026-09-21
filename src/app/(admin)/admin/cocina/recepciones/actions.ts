"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { leerComprobanteConGroq, validarComprobante } from "@/lib/groq";

type Result = { error: string } | { ok: true; id: string };

function revalidateAll() {
  revalidatePath("/admin/cocina/recepciones");
  revalidatePath("/admin/cocina/insumos");
  revalidatePath("/admin/cocina/recetas");
}

export type InsumoBasico = {
  id: string;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  stock_actual: number;
  proveedor: string | null;
};

export async function getInsumos(): Promise<InsumoBasico[]> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;
  const { data } = await db
    .from("insumos")
    .select("id, nombre, unidad, precio_unitario, stock_actual, proveedor")
    .order("nombre");
  return ((data ?? []) as any[]).map(i => ({
    id:              i.id,
    nombre:          i.nombre,
    unidad:          i.unidad,
    precio_unitario: Number(i.precio_unitario ?? 0),
    stock_actual:    Number(i.stock_actual ?? 0),
    proveedor:       i.proveedor ?? null,
  }));
}

export type ItemInput = {
  insumo_id:         string;
  cantidad:          number;
  unidad:            string;
  precio_unitario:   number;  // precio NETO (sin IVA)
  iva_pct:           number;  // 0 | 10.5 | 21 (u otro)
  fecha_vencimiento: string | null;
};

// Sin acentos, en minúsculas, espacios colapsados -- para comparar "HARINA 000"
// contra "Harina 000 x25kg" sin que un tilde o un espacio de más rompa el match.
function normalizarNombre(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Distancia de edición clásica -- para sugerir candidatos cuando el nombre
// leído no matchea exacto ni como substring de ninguno del catálogo (ej.
// typo de la IA o abreviatura: "harna 000" vs "harina 000").
function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function similitud(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distanciaLevenshtein(a, b) / maxLen;
}

export type CandidatoInsumo = { id: string; nombre: string };

export type LineaRemitoLeida = {
  producto:      string;
  cantidad:      number;
  precio:        number;
  insumoIdMatch: string | null;
  candidatos:    CandidatoInsumo[]; // sugerencias cuando no hubo match único claro
};

export type ComprobanteLeidoResult = {
  error?:        string;
  cabecera?:     { proveedor: string | null; cuit: string | null; fecha: string | null; numero: string | null };
  lineas?:       LineaRemitoLeida[];
  advertencias?: string[];
};

// Lee una foto de factura/remito con IA (Groq) y devuelve las líneas con el
// insumo del catálogo matcheado cuando hay uno solo claro -- nunca adivina
// entre varios candidatos, esas líneas quedan sin matchear para elegir a
// mano. Los modelos de visión de Groq son "preview" (ver lib/groq.ts) -- las
// advertencias de consistencia viajan igual, para revisar antes de guardar.
export async function leerRemitoRecepcion(imageBase64: string, mimeType: string): Promise<ComprobanteLeidoResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "produccion"].includes(role ?? "")) return { error: "No autorizado" };

  let comprobante;
  try {
    comprobante = await leerComprobanteConGroq(imageBase64, mimeType);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (comprobante.items.length === 0) return { error: "No se pudo leer ninguna línea en la foto" };

  const db = createAdminClient() as any;
  const { data: insumosRaw, error: insumosError } = await db.from("insumos").select("id, nombre");
  if (insumosError) return { error: insumosError.message };

  type CatalogoInsumo = { id: string; nombre: string; nombreNorm: string };
  const catalogo: CatalogoInsumo[] = (insumosRaw ?? []).map((i: any) => ({
    id: i.id as string, nombre: i.nombre as string, nombreNorm: normalizarNombre(i.nombre),
  }));

  const UMBRAL_SUGERENCIA = 0.55; // similitud mínima para aparecer como candidato
  const UMBRAL_AUTOMATCH  = 0.85; // similitud desde la que se auto-asigna si es el único

  const lineas: LineaRemitoLeida[] = comprobante.items.map((l) => {
    const nombreNorm = normalizarNombre(l.descripcion);
    const exactos = catalogo.filter((p) => p.nombreNorm === nombreNorm);
    let match = exactos.length === 1 ? exactos[0] : null;

    if (!match) {
      const parciales = catalogo.filter((p) => p.nombreNorm.includes(nombreNorm) || nombreNorm.includes(p.nombreNorm));
      match = parciales.length === 1 ? parciales[0] : null;
    }

    let candidatos: CandidatoInsumo[] = [];
    if (!match) {
      const puntuados = catalogo
        .map((p) => ({ ...p, score: similitud(nombreNorm, p.nombreNorm) }))
        .filter((p) => p.score >= UMBRAL_SUGERENCIA)
        .sort((a, b) => b.score - a.score);

      // Solo se auto-asigna si el mejor candidato es claramente el único bueno
      // (muy similar, y bastante más que el segundo) -- si no, queda como
      // sugerencia para elegir con un clic, nunca se adivina a ciegas.
      if (puntuados.length === 1 && puntuados[0].score >= UMBRAL_AUTOMATCH) {
        match = puntuados[0];
      } else if (puntuados.length >= 2 && puntuados[0].score >= UMBRAL_AUTOMATCH && puntuados[0].score - puntuados[1].score >= 0.15) {
        match = puntuados[0];
      } else {
        candidatos = puntuados.slice(0, 3).map((p) => ({ id: p.id, nombre: p.nombre }));
      }
    }

    return {
      producto:      l.descripcion,
      cantidad:      l.cantidad,
      precio:        l.precio_unitario,
      insumoIdMatch: match?.id ?? null,
      candidatos,
    };
  });

  return {
    cabecera: {
      proveedor: comprobante.proveedor,
      cuit:      comprobante.cuit,
      fecha:     comprobante.fecha,
      numero:    comprobante.numero_comprobante,
    },
    lineas,
    advertencias: validarComprobante(comprobante),
  };
}

export async function registrarRecepcion(
  tipo:             string,
  numero:           string,
  proveedor:        string,
  fecha:            string,
  notas:            string | null,
  otros_impuestos:  number,
  items:            ItemInput[],
  imagenUrl:        string | null = null,
  proveedorCuit:    string | null = null,
): Promise<Result> {
  const db       = createAdminClient() as any;

  let user;
  try { user = await requireRole("admin", "produccion"); } catch { return { error: "No autorizado" }; }

  if (!tipo || !numero.trim() || !proveedor.trim())
    return { error: "Tipo, número y proveedor son requeridos" };
  if (items.length === 0)
    return { error: "Agregá al menos un ítem" };

  // Total = suma de (subtotal_neto + IVA) + otros_impuestos
  const totalNeto = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const totalIva  = items.reduce((s, i) => s + i.cantidad * i.precio_unitario * (i.iva_pct / 100), 0);
  const total     = totalNeto + totalIva + (otros_impuestos || 0);

  // 1. Insertar cabecera
  const { data: rec, error: errRec } = await db
    .from("recepciones")
    .insert({
      tipo,
      numero:          numero.trim(),
      proveedor:       proveedor.trim(),
      fecha,
      notas,
      total,
      otros_impuestos: otros_impuestos || 0,
      imagen_url:      imagenUrl,
      proveedor_cuit:  proveedorCuit?.trim() || null,
      created_by:      user.id,
    })
    .select("id")
    .single();

  if (errRec) return { error: errRec.message };

  // 2. Insertar ítems + actualizar stock y precio
  for (const item of items) {
    await db.from("recepciones_items").insert({
      recepcion_id:      rec.id,
      insumo_id:         item.insumo_id,
      cantidad:          item.cantidad,
      unidad:            item.unidad,
      precio_unitario:   item.precio_unitario,
      iva_pct:           item.iva_pct,
      fecha_vencimiento: item.fecha_vencimiento || null,
    });

    // Sumar al stock actual
    const { data: cur } = await db
      .from("insumos")
      .select("stock_actual")
      .eq("id", item.insumo_id)
      .single();
    const nuevoStock = Number(cur?.stock_actual ?? 0) + item.cantidad;

    await db.from("insumos").update({
      stock_actual:    nuevoStock,
      precio_unitario: item.precio_unitario,  // almacenamos precio NETO
    }).eq("id", item.insumo_id);

    // Registrar en kardex
    await db.from("insumos_movimientos").insert({
      insumo_id:     item.insumo_id,
      tipo:          "ingreso",
      cantidad:      item.cantidad,
      motivo:        "compra",
      referencia_id: rec.id,
      notas:         `${tipo === "factura" ? "Factura" : "Remito"} ${numero} — ${proveedor}`,
      created_by:    user.id,
    });
  }

  revalidateAll();
  return { ok: true, id: rec.id };
}

export type RecepcionItem = {
  id: string;
  insumo_id: string;
  insumo_nombre: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  iva_pct: number;
  fecha_vencimiento: string | null;
  subtotal_neto: number;
  subtotal_civa: number;
};

export type RecepcionHistorial = {
  id: string;
  tipo: string;
  numero: string;
  proveedor: string;
  fecha: string;
  notas: string | null;
  total: number | null;
  otros_impuestos: number;
  imagen_url: string | null;
  proveedor_cuit: string | null;
  created_at: string;
  items: RecepcionItem[];
};

export async function getHistorialRecepciones(limit = 30): Promise<RecepcionHistorial[]> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;

  const { data } = await db
    .from("recepciones")
    .select("id, tipo, numero, proveedor, fecha, notas, total, otros_impuestos, imagen_url, proveedor_cuit, created_at")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const ids = (data as any[]).map((r: any) => r.id);
  const { data: itemsRaw } = await db
    .from("recepciones_items")
    .select("id, recepcion_id, insumo_id, cantidad, unidad, precio_unitario, iva_pct, fecha_vencimiento, insumo:insumos!insumo_id(nombre)")
    .in("recepcion_id", ids);

  const itemsByRecepcion: Record<string, RecepcionItem[]> = {};
  for (const it of (itemsRaw ?? []) as any[]) {
    const cant   = Number(it.cantidad);
    const precio = Number(it.precio_unitario);
    const iva    = Number(it.iva_pct ?? 0);
    const neto   = cant * precio;
    const item: RecepcionItem = {
      id:                it.id,
      insumo_id:         it.insumo_id,
      insumo_nombre:     it.insumo?.nombre ?? "—",
      cantidad:          cant,
      unidad:            it.unidad ?? "",
      precio_unitario:   precio,
      iva_pct:           iva,
      fecha_vencimiento: it.fecha_vencimiento ?? null,
      subtotal_neto:     neto,
      subtotal_civa:     neto * (1 + iva / 100),
    };
    if (!itemsByRecepcion[it.recepcion_id]) itemsByRecepcion[it.recepcion_id] = [];
    itemsByRecepcion[it.recepcion_id].push(item);
  }

  return (data as any[]).map(r => ({
    id:              r.id,
    tipo:            r.tipo,
    numero:          r.numero,
    proveedor:       r.proveedor,
    fecha:           r.fecha,
    notas:           r.notas ?? null,
    total:           r.total !== null ? Number(r.total) : null,
    otros_impuestos: Number(r.otros_impuestos ?? 0),
    imagen_url:      r.imagen_url ?? null,
    proveedor_cuit:  r.proveedor_cuit ?? null,
    created_at:      r.created_at,
    items:           itemsByRecepcion[r.id] ?? [],
  }));
}
