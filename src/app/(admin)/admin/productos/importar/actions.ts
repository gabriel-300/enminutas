"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") throw new Error("No autorizado");
  return user;
}

export type ChangeRow = {
  id:                  string;
  codigo:              number;
  nombre:              string;
  costo_actual:        number;
  costo_nuevo:         number;
  pkg_unitario_actual: number;
  pkg_unitario_nuevo:  number;
  pkg_bulto_actual:    number;
  pkg_bulto_nuevo:     number;
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

    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { error: "El archivo está vacío o solo tiene encabezado." };

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const codigoIdx   = header.indexOf("codigo");
    const costoIdx    = header.indexOf("costo");
    const pkgUnitIdx  = header.indexOf("pkg_unitario");
    const pkgBultoIdx = header.indexOf("pkg_bulto");

    if (codigoIdx === -1) return { error: 'El archivo no tiene la columna "codigo".' };
    if (costoIdx  === -1) return { error: 'El archivo no tiene la columna "costo".' };

    const csvRows: Record<number, { costo: number; pkg_unitario: number; pkg_bulto: number }> = {};
    const errores: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCsvLine(line);
      const codigoRaw = cols[codigoIdx] ?? "";
      const costoRaw  = (cols[costoIdx] ?? "").replace(",", ".");

      if (!codigoRaw) continue;

      const codigo = parseInt(codigoRaw, 10);
      const costo  = parseFloat(costoRaw);

      if (isNaN(codigo)) { errores.push(`Fila ${i + 1}: código inválido "${codigoRaw}"`); continue; }
      if (isNaN(costo) || costo < 0) { errores.push(`Fila ${i + 1}: costo inválido "${costoRaw}"`); continue; }

      const pkgU = pkgUnitIdx  !== -1 ? parseFloat((cols[pkgUnitIdx]  ?? "0").replace(",", ".")) : 0;
      const pkgB = pkgBultoIdx !== -1 ? parseFloat((cols[pkgBultoIdx] ?? "0").replace(",", ".")) : 0;

      csvRows[codigo] = {
        costo,
        pkg_unitario: isNaN(pkgU) ? 0 : pkgU,
        pkg_bulto:    isNaN(pkgB) ? 0 : pkgB,
      };
    }

    if (Object.keys(csvRows).length === 0 && errores.length === 0) {
      return { error: "El archivo no contiene filas válidas." };
    }

    const { data: products } = await (createAdminClient() as any)
      .from("products")
      .select("id, codigo, name, costo, pkg_unitario, pkg_bulto")
      .not("codigo", "is", null);

    const rows: ChangeRow[] = [];
    for (const p of (products ?? []) as any[]) {
      const csv = csvRows[Number(p.codigo)];
      if (!csv) continue;

      const costoActual = Number(p.costo ?? 0);
      const pkgUActual  = Number(p.pkg_unitario ?? 0);
      const pkgBActual  = Number(p.pkg_bulto ?? 0);

      const cambia =
        Math.round(costoActual * 100) !== Math.round(csv.costo * 100) ||
        Math.round(pkgUActual  * 100) !== Math.round(csv.pkg_unitario * 100) ||
        Math.round(pkgBActual  * 100) !== Math.round(csv.pkg_bulto * 100);

      rows.push({
        id:                  p.id,
        codigo:              Number(p.codigo),
        nombre:              p.name,
        costo_actual:        costoActual,
        costo_nuevo:         csv.costo,
        pkg_unitario_actual: pkgUActual,
        pkg_unitario_nuevo:  csv.pkg_unitario,
        pkg_bulto_actual:    pkgBActual,
        pkg_bulto_nuevo:     csv.pkg_bulto,
        cambia,
      });
    }

    rows.sort((a, b) => a.codigo - b.codigo);

    return { rows, errores, total_cambios: rows.filter((r) => r.cambia).length };
  } catch (e: any) {
    return { error: e.message ?? "Error desconocido." };
  }
}

export async function aplicarImport(
  changes: Array<{ id: string; costo: number; pkg_unitario: number; pkg_bulto: number }>
) {
  await requireAdmin();
  if (!changes.length) throw new Error("No hay cambios para aplicar.");

  const db = createAdminClient() as any;
  const errores: string[] = [];

  for (const c of changes) {
    const { error } = await db
      .from("products")
      .update({ costo: c.costo, pkg_unitario: c.pkg_unitario, pkg_bulto: c.pkg_bulto })
      .eq("id", c.id);
    if (error) errores.push(`id ${c.id}: ${error.message}`);
  }

  if (errores.length) throw new Error(errores.join("; "));

  revalidatePath("/admin/productos");
  revalidatePath("/admin/reportes/precios");
  revalidatePath("/b2b/catalogo");
}
