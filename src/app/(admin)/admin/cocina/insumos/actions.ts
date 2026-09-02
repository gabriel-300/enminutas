"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

function revalidateAll() {
  revalidatePath("/admin/cocina/insumos");
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/cocina/compras");
}

export async function crearInsumo(formData: FormData): Promise<Result> {
  const nombre  = (formData.get("nombre") as string)?.trim();
  const unidad  = (formData.get("unidad") as string)?.trim() || "gr";
  const precio  = parseFloat((formData.get("precio_unitario") as string)?.replace(",", ".")) || 0;
  const proveed = (formData.get("proveedor") as string)?.trim() || null;
  const notas   = (formData.get("notas") as string)?.trim() || null;

  if (!nombre) return { error: "El nombre es requerido" };

  const db = createAdminClient() as any;
  const { error } = await db.from("insumos").insert({ nombre, unidad, precio_unitario: precio, proveedor: proveed, notas });
  if (error) {
    if (error.code === "23505") return { error: `Ya existe un insumo llamado "${nombre}".` };
    return { error: error.message };
  }
  revalidateAll();
  return { ok: true };
}

export async function actualizarPrecioInsumo(id: string, precio: number): Promise<Result> {
  const db = createAdminClient() as any;
  const { error } = await db.from("insumos").update({ precio_unitario: precio }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function actualizarInsumo(id: string, formData: FormData): Promise<Result> {
  const nombre  = (formData.get("nombre") as string)?.trim();
  const unidad  = (formData.get("unidad") as string)?.trim() || "gr";
  const precio  = parseFloat((formData.get("precio_unitario") as string)?.replace(",", ".")) || 0;
  const proveed = (formData.get("proveedor") as string)?.trim() || null;
  const notas   = (formData.get("notas") as string)?.trim() || null;

  if (!nombre) return { error: "El nombre es requerido" };

  const db = createAdminClient() as any;
  const { error } = await db.from("insumos").update({ nombre, unidad, precio_unitario: precio, proveedor: proveed, notas }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: `Ya existe un insumo llamado "${nombre}".` };
    return { error: error.message };
  }
  revalidateAll();
  return { ok: true };
}

export async function eliminarInsumo(id: string): Promise<Result> {
  const db = createAdminClient() as any;

  // Verificar que no esté en uso en ninguna receta
  const { data: uso } = await db
    .from("recipe_ingredients")
    .select("id")
    .eq("insumo_id", id)
    .limit(1);

  if (uso && uso.length > 0)
    return { error: "Este insumo está siendo usado en una o más recetas. Quitalo de las recetas antes de eliminarlo." };

  const { error } = await db.from("insumos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// ── Stock ──────────────────────────────────────────────────────────────────────

export async function ingresarStock(
  insumoId: string,
  cantidad: number,
  notas: string | null,
): Promise<Result> {
  if (cantidad <= 0) return { error: "La cantidad debe ser mayor a 0" };
  const db = createAdminClient() as any;
  const { data: cur } = await db.from("insumos").select("stock_actual").eq("id", insumoId).single();
  const nuevo = Number(cur?.stock_actual ?? 0) + cantidad;
  const { error } = await db.from("insumos").update({ stock_actual: nuevo }).eq("id", insumoId);
  if (error) return { error: error.message };
  await db.from("insumos_movimientos").insert({
    insumo_id: insumoId, tipo: "ingreso", cantidad, motivo: "compra", notas: notas || null,
  });
  revalidateAll();
  return { ok: true };
}

export async function ajustarStock(
  insumoId: string,
  stockNuevo: number,
  notas: string | null,
): Promise<Result> {
  const db = createAdminClient() as any;
  const { data: cur } = await db.from("insumos").select("stock_actual").eq("id", insumoId).single();
  const delta = stockNuevo - Number(cur?.stock_actual ?? 0);
  const { error } = await db.from("insumos").update({ stock_actual: stockNuevo }).eq("id", insumoId);
  if (error) return { error: error.message };
  await db.from("insumos_movimientos").insert({
    insumo_id: insumoId, tipo: "ajuste", cantidad: delta,
    motivo: "ajuste_manual", notas: notas || null,
  });
  revalidateAll();
  return { ok: true };
}

export async function actualizarStockControl(
  insumoId: string,
  stockMinimo: number,
  puntoPedido: number,
  stockMaximo: number,
): Promise<Result> {
  const db = createAdminClient() as any;
  const { error } = await db.from("insumos")
    .update({ stock_minimo: stockMinimo, punto_pedido: puntoPedido, stock_maximo: stockMaximo })
    .eq("id", insumoId);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// ── Importador CSV ─────────────────────────────────────────────────────────────
// Formato esperado: dos columnas, con o sin header.
// Separadores soportados: coma, punto y coma, tabulación.
// Columnas: nombre | precio_unitario
// Match por nombre case-insensitive. Solo actualiza insumos existentes.
// Devuelve resumen: actualizados, no encontrados.

export type ImportResult = {
  ok: true;
  actualizados: number;
  noEncontrados: string[];
  errores: string[];
} | { error: string };

export async function importarPreciosCSV(csvText: string): Promise<ImportResult> {
  if (!csvText?.trim()) return { error: "El archivo está vacío." };

  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { error: "No se encontraron filas." };

  // Detectar separador
  const firstLine = lines[0];
  const sep = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";

  // Parsear filas: ignorar header si la segunda columna no es numérica
  const rows: { nombre: string; precio: number }[] = [];
  for (const line of lines) {
    const parts = line.split(sep).map(s => s.trim().replace(/^["']|["']$/g, ""));
    if (parts.length < 2) continue;
    const precio = parseFloat(parts[1].replace(",", ".").replace(/\./g, (m, i, s) => i === s.lastIndexOf(".") ? "." : ""));
    if (isNaN(precio)) continue; // Skip header o filas no numéricas
    if (!parts[0]) continue;
    rows.push({ nombre: parts[0], precio });
  }

  if (rows.length === 0)
    return { error: "No se encontraron filas válidas. El formato esperado es: nombre,precio (una por línea)." };

  const db = createAdminClient() as any;

  // Traer todos los insumos para matchear por nombre
  const { data: todos } = await db.from("insumos").select("id, nombre");
  const mapaInsumos: Record<string, string> = {};
  for (const ins of (todos ?? []) as { id: string; nombre: string }[]) {
    mapaInsumos[ins.nombre.toLowerCase().trim()] = ins.id;
  }

  let actualizados = 0;
  const noEncontrados: string[] = [];
  const errores: string[] = [];

  for (const row of rows) {
    const id = mapaInsumos[row.nombre.toLowerCase().trim()];
    if (!id) {
      noEncontrados.push(row.nombre);
      continue;
    }
    const { error } = await db.from("insumos").update({ precio_unitario: row.precio }).eq("id", id);
    if (error) {
      errores.push(`${row.nombre}: ${error.message}`);
    } else {
      actualizados++;
    }
  }

  revalidateAll();
  return { ok: true, actualizados, noEncontrados, errores };
}
