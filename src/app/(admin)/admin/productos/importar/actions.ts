"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ChangeRow = {
  id:                  string;
  codigo:              number;
  nombre:              string;
  costo_actual:        number;
  costo_nuevo:         number;
  cambia:              boolean;
};

export type ParseResult = {
  rows:          ChangeRow[];
  errores:       string[];
  total_cambios: number;
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export async function parsearImport(formData: FormData): Promise<ParseResult | { error: string }> {
  try {
    await requireAdmin();

    const file = formData.get("archivo") as File | null;
    if (!file) return { error: "No se recibió archivo." };

    // Quitar BOM si está presente
    const raw = file.text ? await file.text() : "";
    const text = raw.replace(/^﻿/, "");
    const allLines = text.trim().split(/\r?\n/);

    // Saltar línea "sep=;" si Excel la agrega
    const lines = allLines[0].toLowerCase().startsWith("sep=") ? allLines.slice(1) : allLines;
    if (lines.length < 2) return { error: "El archivo está vacío o solo tiene encabezado." };

    // Auto-detectar separador: ; o ,
    const sep = lines[0].includes(";") ? ";" : ",";

    // Normalizar header: quitar tildes, minúsculas, sin espacios
    const normalizar = (s: string) =>
      s.toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/^"|"$/g, "").trim()
        .replace(/\s+/g, "_");

    const headerRaw = lines[0].split(sep).map(normalizar);

    // Mapeo flexible: acepta nombres en español e inglés
    const findCol = (...names: string[]) => {
      for (const n of names) { const i = headerRaw.indexOf(n); if (i !== -1) return i; }
      return -1;
    };

    const codigoIdx   = findCol("codigo", "cod", "code");
    const costoIdx    = findCol("costo_por_bolsa", "costo", "precio", "price", "cost");

    if (codigoIdx === -1) return { error: 'El archivo no tiene la columna "Código".' };
    if (costoIdx  === -1) return { error: 'El archivo no tiene la columna "Costo por bolsa".' };

    const csvRows: Record<number, { costo: number }> = {};
    const errores: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = sep === ";" ? line.split(";") : parseCsvLine(line);
      const codigoRaw = (cols[codigoIdx] ?? "").trim();
      const costoRaw  = (cols[costoIdx] ?? "").replace(/\./g, "").replace(",", ".");

      if (!codigoRaw) continue;

      const codigo = parseInt(codigoRaw, 10);
      const costo  = parseFloat(costoRaw);

      if (isNaN(codigo)) { errores.push(`Fila ${i + 1}: código inválido "${codigoRaw}"`); continue; }
      if (isNaN(costo) || costo < 0) { errores.push(`Fila ${i + 1}: costo inválido "${costoRaw}"`); continue; }


      csvRows[codigo] = {
        costo,
      };
    }

    if (Object.keys(csvRows).length === 0 && errores.length === 0) {
      return { error: "El archivo no contiene filas válidas." };
    }

    const db = createAdminClient() as any;
    const [{ data: products }, { data: recetas }] = await Promise.all([
      db.from("products").select("id, codigo, name, costo, receta_producto_id").not("codigo", "is", null),
      db.from("recipes").select("product_id"),
    ]);

    // Tarea 82: un producto con receta no se actualiza por CSV, el costo sale solo de la receta.
    const conReceta = new Set(((recetas ?? []) as any[]).map((r) => r.product_id));

    const rows: ChangeRow[] = [];
    for (const p of (products ?? []) as any[]) {
      const csv = csvRows[Number(p.codigo)];
      if (!csv) continue;

      const costoActual = Number(p.costo ?? 0);
      const difiere = Math.round(costoActual * 100) !== Math.round(csv.costo * 100);
      const tieneReceta = conReceta.has(p.id) || !!p.receta_producto_id;

      if (tieneReceta) {
        if (difiere) errores.push(`Código ${p.codigo} (${p.name}): tiene receta, el costo se sincroniza desde Recetas — se ignora el valor del CSV.`);
        continue;
      }

      rows.push({
        id:                  p.id,
        codigo:              Number(p.codigo),
        nombre:              p.name,
        costo_actual:        costoActual,
        costo_nuevo:         csv.costo,
        cambia:              difiere,
      });
    }

    rows.sort((a, b) => a.codigo - b.codigo);

    return { rows, errores, total_cambios: rows.filter((r) => r.cambia).length };
  } catch (e: any) {
    return { error: e.message ?? "Error desconocido." };
  }
}

export async function aplicarImport(
  changes: Array<{ id: string; costo: number }>
) {
  await requireAdmin();
  if (!changes.length) throw new Error("No hay cambios para aplicar.");

  const db = createAdminClient() as any;
  const errores: string[] = [];

  // Defensa adicional: nunca pisar el costo de un producto con receta, aunque llegue en el POST.
  const [{ data: productosConReceta }, { data: recetasIds }] = await Promise.all([
    db.from("products").select("id").in("id", changes.map((c) => c.id)).not("receta_producto_id", "is", null),
    db.from("recipes").select("product_id").in("product_id", changes.map((c) => c.id)),
  ]);
  const bloqueados = new Set([
    ...((productosConReceta ?? []) as any[]).map((p) => p.id),
    ...((recetasIds ?? []) as any[]).map((r) => r.product_id),
  ]);
  const changesFiltrados = changes.filter((c) => !bloqueados.has(c.id));

  for (const c of changesFiltrados) {
    const { error } = await db
      .from("products")
      .update({ costo: c.costo })
      .eq("id", c.id);
    if (error) errores.push(`id ${c.id}: ${error.message}`);
  }

  if (errores.length) throw new Error(errores.join("; "));

  revalidatePath("/admin/productos");
  revalidatePath("/admin/reportes/precios");
  revalidatePath("/b2b/catalogo");
}
