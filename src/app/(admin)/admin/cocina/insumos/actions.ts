"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true };

function revalidateAll() {
  revalidatePath("/admin/cocina/insumos");
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/cocina/compras");
}

// ── Insumos CRUD ───────────────────────────────────────────────────────────────

export async function crearInsumo(formData: FormData): Promise<Result> {
  await requireRole("admin", "produccion");
  const nombre    = (formData.get("nombre") as string)?.trim();
  const unidad    = (formData.get("unidad") as string)?.trim() || "gr";
  const precio    = parseFloat((formData.get("precio_unitario") as string)?.replace(",", ".")) || 0;
  const proveed   = (formData.get("proveedor") as string)?.trim() || null;
  const notas     = (formData.get("notas") as string)?.trim() || null;
  const categoria = (formData.get("categoria") as string)?.trim() || "otros";

  if (!nombre) return { error: "El nombre es requerido" };

  const db = createAdminClient() as any;
  const { error } = await db.from("insumos").insert({ nombre, unidad, precio_unitario: precio, proveedor: proveed, notas, categoria });
  if (error) {
    if (error.code === "23505") return { error: `Ya existe un insumo llamado "${nombre}".` };
    return { error: error.message };
  }
  revalidateAll();
  return { ok: true };
}

export async function actualizarPrecioInsumo(id: string, precio: number): Promise<Result> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;
  const { error } = await db.from("insumos").update({ precio_unitario: precio }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function actualizarInsumo(id: string, formData: FormData): Promise<Result> {
  await requireRole("admin", "produccion");
  const nombre    = (formData.get("nombre") as string)?.trim();
  const unidad    = (formData.get("unidad") as string)?.trim() || "gr";
  const precio    = parseFloat((formData.get("precio_unitario") as string)?.replace(",", ".")) || 0;
  const proveed   = (formData.get("proveedor") as string)?.trim() || null;
  const notas     = (formData.get("notas") as string)?.trim() || null;
  const categoria = (formData.get("categoria") as string)?.trim() || "otros";

  if (!nombre) return { error: "El nombre es requerido" };

  const db = createAdminClient() as any;

  // Activo / inactivo: un insumo inactivo no aparece en la lista, las alertas ni los selectores, pero conserva su historial.
  // Si el formulario no trae el campo, no se toca. No se puede desactivar uno que esté en recetas: seguiría sumando al costo oculto.
  const campos: Record<string, any> = { nombre, unidad, precio_unitario: precio, proveedor: proveed, notas, categoria };
  if (formData.has("activo")) {
    const activo = formData.get("activo") === "1";
    if (!activo) {
      const { count } = await db.from("recipe_ingredients").select("id", { count: "exact", head: true }).eq("insumo_id", id);
      if ((count ?? 0) > 0)
        return { error: `No se puede desactivar: está en ${count} receta${count === 1 ? "" : "s"}. Reemplazalo en las recetas antes de desactivarlo.` };
    }
    campos.activo = activo;
  }
  const { error } = await db.from("insumos").update(campos).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: `Ya existe un insumo llamado "${nombre}".` };
    return { error: error.message };
  }
  revalidateAll();
  return { ok: true };
}

export async function eliminarInsumo(id: string): Promise<Result> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;

  // La base no deja borrar un insumo con historial (recetas, compras o movimientos de stock): se perdería
  // el registro de lo comprado y consumido. Se revisa antes para explicarlo en vez de mostrar el error técnico.
  const cuenta = async (tabla: string) => {
    const { count } = await db.from(tabla).select("id", { count: "exact", head: true }).eq("insumo_id", id);
    return count ?? 0;
  };
  const [recetas, compras, movimientos] = await Promise.all([
    cuenta("recipe_ingredients"), cuenta("recepciones_items"), cuenta("insumos_movimientos"),
  ]);

  if (recetas > 0)
    return { error: `Este insumo está en ${recetas} receta${recetas === 1 ? "" : "s"}. Quitalo de las recetas antes de eliminarlo.` };
  if (compras > 0)
    return {
      error: `No se puede eliminar: figura en ${compras} compra${compras === 1 ? "" : "s"} cargada${compras === 1 ? "" : "s"}, ` +
        "y borrarlo haría perder ese historial. Si ya no lo usás, dejalo con stock 0 y sin stock mínimo para que no genere alertas.",
    };
  if (movimientos > 0)
    return {
      error: `No se puede eliminar: tiene ${movimientos} movimiento${movimientos === 1 ? "" : "s"} de stock registrado${movimientos === 1 ? "" : "s"}. ` +
        "Si ya no lo usás, dejalo con stock 0 y sin stock mínimo.",
    };

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
  await requireRole("admin", "produccion");
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
  await requireRole("admin", "produccion");
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
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;
  const { error } = await db.from("insumos")
    .update({ stock_minimo: stockMinimo, punto_pedido: puntoPedido, stock_maximo: stockMaximo })
    .eq("id", insumoId);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// ── Categorías CRUD ────────────────────────────────────────────────────────────

export type Categoria = {
  id: string;
  nombre: string;
  valor: string;
  color: string;
  orden: number;
};

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export async function getCategorias(): Promise<Categoria[]> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;
  const { data } = await db
    .from("categorias_insumos")
    .select("id, nombre, valor, color, orden")
    .order("orden")
    .order("nombre");
  return (data ?? []) as Categoria[];
}

export async function crearCategoria(nombre: string, color: string): Promise<Result> {
  await requireRole("admin", "produccion");
  const nom = nombre.trim();
  if (!nom) return { error: "El nombre es requerido" };
  const valor = slugify(nom);
  if (!valor) return { error: "Nombre inválido" };

  const db = createAdminClient() as any;
  const { error } = await db.from("categorias_insumos").insert({ nombre: nom, valor, color });
  if (error) {
    if (error.code === "23505") return { error: `Ya existe una categoría con ese nombre.` };
    return { error: error.message };
  }
  revalidateAll();
  return { ok: true };
}

export async function actualizarCategoria(id: string, nombre: string, color: string): Promise<Result> {
  await requireRole("admin", "produccion");
  const nom = nombre.trim();
  if (!nom) return { error: "El nombre es requerido" };

  const db = createAdminClient() as any;
  const { error } = await db.from("categorias_insumos").update({ nombre: nom, color }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function eliminarCategoria(id: string): Promise<Result> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;

  // Verificar que no haya insumos usando esta categoría
  const { data: cat } = await db.from("categorias_insumos").select("valor").eq("id", id).single();
  if (!cat) return { error: "Categoría no encontrada" };

  const { data: uso } = await db
    .from("insumos")
    .select("id")
    .eq("categoria", cat.valor)
    .limit(1);

  if (uso && uso.length > 0)
    return { error: "Esta categoría tiene insumos asignados. Reasignalos antes de eliminarla." };

  const { error } = await db.from("categorias_insumos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

// ── Importador CSV ─────────────────────────────────────────────────────────────

export type ImportResult = {
  ok: true;
  actualizados: number;
  noEncontrados: string[];
  errores: string[];
} | { error: string };

export async function importarPreciosCSV(csvText: string): Promise<ImportResult> {
  await requireRole("admin", "produccion");
  if (!csvText?.trim()) return { error: "El archivo está vacío." };

  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { error: "No se encontraron filas." };

  const firstLine = lines[0];
  const sep = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";

  const rows: { nombre: string; precio: number }[] = [];
  for (const line of lines) {
    const parts = line.split(sep).map(s => s.trim().replace(/^["']|["']$/g, ""));
    if (parts.length < 2) continue;
    const precio = parseFloat(parts[1].replace(",", ".").replace(/\./g, (m, i, s) => i === s.lastIndexOf(".") ? "." : ""));
    if (isNaN(precio)) continue;
    if (!parts[0]) continue;
    rows.push({ nombre: parts[0], precio });
  }

  if (rows.length === 0)
    return { error: "No se encontraron filas válidas. El formato esperado es: nombre,precio (una por línea)." };

  const db = createAdminClient() as any;

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
