"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function registrarRecepcion(
  tipo:             string,
  numero:           string,
  proveedor:        string,
  fecha:            string,
  notas:            string | null,
  otros_impuestos:  number,
  items:            ItemInput[],
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

export type RecepcionHistorial = {
  id: string;
  tipo: string;
  numero: string;
  proveedor: string;
  fecha: string;
  total: number | null;
  created_at: string;
  items_count: number;
};

export async function getHistorialRecepciones(limit = 30): Promise<RecepcionHistorial[]> {
  const db = createAdminClient() as any;

  const { data } = await db
    .from("recepciones")
    .select("id, tipo, numero, proveedor, fecha, total, created_at")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const ids = (data as any[]).map((r: any) => r.id);
  const { data: counts } = await db
    .from("recepciones_items")
    .select("recepcion_id")
    .in("recepcion_id", ids);

  const countMap: Record<string, number> = {};
  for (const c of (counts ?? []) as any[]) {
    countMap[c.recepcion_id] = (countMap[c.recepcion_id] ?? 0) + 1;
  }

  return (data as any[]).map(r => ({
    id:          r.id,
    tipo:        r.tipo,
    numero:      r.numero,
    proveedor:   r.proveedor,
    fecha:       r.fecha,
    total:       r.total !== null ? Number(r.total) : null,
    created_at:  r.created_at,
    items_count: countMap[r.id] ?? 0,
  }));
}
