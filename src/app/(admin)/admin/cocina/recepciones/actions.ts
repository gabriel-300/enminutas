"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
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

export type LineaRemitoLeida = {
  producto:      string;
  cantidad:      number;
  precio:        number;
  insumoIdMatch: string | null;
};

export type ComprobanteLeidoResult = {
  error?:        string;
  cabecera?:     { proveedor: string | null; fecha: string | null; numero: string | null };
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

  const catalogo = (insumosRaw ?? []).map((i: any) => ({ id: i.id as string, nombreNorm: normalizarNombre(i.nombre) }));

  const lineas: LineaRemitoLeida[] = comprobante.items.map((l) => {
    const nombreNorm = normalizarNombre(l.descripcion);
    const exactos = catalogo.filter((p: any) => p.nombreNorm === nombreNorm);
    let match = exactos.length === 1 ? exactos[0] : null;
    if (!match) {
      const parciales = catalogo.filter((p: any) => p.nombreNorm.includes(nombreNorm) || nombreNorm.includes(p.nombreNorm));
      match = parciales.length === 1 ? parciales[0] : null;
    }
    return { producto: l.descripcion, cantidad: l.cantidad, precio: l.precio_unitario, insumoIdMatch: match?.id ?? null };
  });

  return {
    cabecera: {
      proveedor: comprobante.proveedor,
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
): Promise<Result> {
  const supabase = await createClient();
  const db       = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

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
  created_at: string;
  items: RecepcionItem[];
};

export async function getHistorialRecepciones(limit = 30): Promise<RecepcionHistorial[]> {
  const db = createAdminClient() as any;

  const { data } = await db
    .from("recepciones")
    .select("id, tipo, numero, proveedor, fecha, notas, total, otros_impuestos, imagen_url, created_at")
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
    created_at:      r.created_at,
    items:           itemsByRecepcion[r.id] ?? [],
  }));
}
