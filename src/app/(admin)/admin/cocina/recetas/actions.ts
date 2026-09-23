"use server";

import { requireRole } from "@/lib/auth";
import { factorABase } from "@/lib/receta-base";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { error: string } | { ok: true };

function revalidateAll() {
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/cocina/compras");
}

export async function guardarReceta(formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "produccion");
  const productId    = formData.get("product_id") as string;
  const yieldCajas   = parseFloat((formData.get("yield_cajas") as string)?.replace(",", ".")) || 1;
  const vidaUtilDias = parseInt(formData.get("vida_util_dias") as string, 10) || 180;
  const notes        = (formData.get("notes") as string | null)?.trim() || null;

  if (!productId) return { error: "Producto requerido" };

  // Pasos: steps[0][description], steps[0][minutes], steps[0][notes]
  const steps: { description: string; minutes: number; notes: string | null }[] = [];
  let i = 0;
  while (formData.get(`steps[${i}][description]`) !== null) {
    const desc = (formData.get(`steps[${i}][description]`) as string).trim();
    const mins = parseFloat(formData.get(`steps[${i}][minutes]`) as string) || 0;
    const note = (formData.get(`steps[${i}][notes]`) as string | null)?.trim() || null;
    if (desc) steps.push({ description: desc, minutes: mins, notes: note });
    i++;
  }

  // Ingredientes: ings[0][insumo_id], ings[0][cantidad]
  const ings: { insumo_id: string; cantidad: number }[] = [];
  let j = 0;
  while (formData.get(`ings[${j}][insumo_id]`) !== null) {
    const insumo_id = (formData.get(`ings[${j}][insumo_id]`) as string).trim();
    const cantidad  = parseFloat((formData.get(`ings[${j}][cantidad]`) as string)?.replace(",", ".")) || 0;
    if (insumo_id && cantidad > 0) ings.push({ insumo_id, cantidad });
    j++;
  }

  const db = createAdminClient() as any;

  const { data: prod } = await db.from("products").select("receta_producto_id").eq("id", productId).maybeSingle();
  if (prod?.receta_producto_id) {
    return { error: "Este producto usa la receta de otro producto. Editá la receta del producto base." };
  }

  // Obtener receta existente o crear nueva
  const { data: existing } = await db
    .from("recipes")
    .select("id")
    .eq("product_id", productId)
    .maybeSingle();

  let recipeId: string;

  if (existing?.id) {
    const { error } = await db.from("recipes").update({ yield_cajas: yieldCajas, vida_util_dias: vidaUtilDias, notes }).eq("id", existing.id);
    if (error) return { error: `Error al actualizar receta: ${error.message}` };
    recipeId = existing.id;
  } else {
    const { data: inserted, error } = await db
      .from("recipes")
      .insert({ product_id: productId, yield_cajas: yieldCajas, vida_util_dias: vidaUtilDias, notes })
      .select("id")
      .single();
    if (error || !inserted) return { error: `Error al crear receta: ${error?.message ?? "sin datos"}` };
    recipeId = inserted.id;
  }

  // Reemplazar pasos
  const { error: delStepsErr } = await db.from("recipe_steps").delete().eq("recipe_id", recipeId);
  if (delStepsErr) return { error: `Error al borrar pasos: ${delStepsErr.message}` };

  if (steps.length > 0) {
    const { error: stepsError } = await db.from("recipe_steps").insert(
      steps.map((s, idx) => ({
        recipe_id:   recipeId,
        step_order:  idx + 1,
        description: s.description,
        minutes:     s.minutes,
        notes:       s.notes,
      }))
    );
    if (stepsError) return { error: `Error al guardar pasos: ${stepsError.message}` };
  }

  // Reemplazar ingredientes (ahora con insumo_id)
  const { error: delIngsErr } = await db.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  if (delIngsErr) return { error: `Error al borrar ingredientes: ${delIngsErr.message}` };

  if (ings.length > 0) {
    const { error: ingsError } = await db.from("recipe_ingredients").insert(
      ings.map(ing => ({ recipe_id: recipeId, insumo_id: ing.insumo_id, cantidad: ing.cantidad }))
    );
    if (ingsError) return { error: `Error al guardar ingredientes: ${ingsError.message}` };
  }

  revalidateAll();
  revalidatePath(`/admin/cocina/recetas/${productId}`);
  return { ok: true };
}

export async function actualizarCostoProducto(
  productId: string,
  costoNuevoPorCaja: number,
  bolsasCaja: number,
): Promise<ActionResult> {
  await requireRole("admin", "produccion");
  if (costoNuevoPorCaja <= 0) return { error: "El costo debe ser mayor a cero" };
  const bolsas = bolsasCaja > 0 ? bolsasCaja : 1;
  const costoUnidad = costoNuevoPorCaja / bolsas;
  const db = createAdminClient() as any;
  const { error } = await db.from("products").update({ costo: costoUnidad }).eq("id", productId);
  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function eliminarReceta(productId: string): Promise<ActionResult> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;

  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("receta_producto_id", productId);
  if (count && count > 0) {
    return { error: `Esta receta la usan ${count} presentación(es). Desvinculalas antes de eliminarla.` };
  }

  const { error } = await db.from("recipes").delete().eq("product_id", productId);
  if (error) {
    if (error.code === "23503") return { error: "No se puede eliminar: la receta ya tiene producciones registradas." };
    return { error: error.message };
  }
  revalidateAll();
  return { ok: true };
}

export async function vincularPresentacion(baseProductId: string, productId: string): Promise<ActionResult> {
  await requireRole("admin", "produccion");
  if (!baseProductId || !productId) return { error: "Faltan datos" };
  if (baseProductId === productId) return { error: "Un producto no puede usar su propia receta como presentación" };

  const db = createAdminClient() as any;

  const [{ data: base }, { data: recetaBase }, { data: pres }, { data: recetaPres }, { count: usadaPorOtros }] = await Promise.all([
    db.from("products").select("id, kg_caja, receta_producto_id").eq("id", baseProductId).maybeSingle(),
    db.from("recipes").select("id").eq("product_id", baseProductId).maybeSingle(),
    db.from("products").select("id, name, kg_caja, receta_producto_id").eq("id", productId).maybeSingle(),
    db.from("recipes").select("id").eq("product_id", productId).maybeSingle(),
    db.from("products").select("id", { count: "exact", head: true }).eq("receta_producto_id", productId),
  ]);

  if (!base || !pres) return { error: "Producto no encontrado" };
  if (!recetaBase) return { error: "El producto base no tiene receta cargada" };
  if (base.receta_producto_id) return { error: "El producto base usa la receta de otro producto" };
  if (!(Number(base.kg_caja) > 0)) return { error: "Cargá el kg por caja del producto base (en Productos) para poder calcular equivalencias" };
  if (!(Number(pres.kg_caja) > 0)) return { error: `Cargá el kg por caja de "${pres.name}" (en Productos) para poder calcular equivalencias` };
  if (recetaPres) return { error: `"${pres.name}" ya tiene receta propia. Eliminala primero si querés que use la del base.` };
  if (usadaPorOtros && usadaPorOtros > 0) return { error: `"${pres.name}" es la receta base de otras presentaciones` };

  const { error } = await db.from("products").update({ receta_producto_id: baseProductId }).eq("id", productId);
  if (error) return { error: error.message };

  revalidateAll();
  revalidatePath(`/admin/cocina/recetas/${baseProductId}`);
  revalidatePath("/admin/cocina/produccion");
  revalidatePath("/admin/cocina/planificador");
  return { ok: true };
}

export async function desvincularPresentacion(productId: string): Promise<ActionResult> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;

  const { data: pres } = await db.from("products").select("receta_producto_id").eq("id", productId).maybeSingle();
  if (!pres?.receta_producto_id) return { error: "Este producto no usa la receta de otro" };
  const baseId = pres.receta_producto_id as string;

  const { error } = await db.from("products").update({ receta_producto_id: null }).eq("id", productId);
  if (error) return { error: error.message };

  revalidateAll();
  revalidatePath(`/admin/cocina/recetas/${baseId}`);
  revalidatePath("/admin/cocina/produccion");
  revalidatePath("/admin/cocina/planificador");
  return { ok: true };
}

// Costo de materia prima por unidad (bolsa/cajita) de una presentación: costo del lote de la receta base,
// dividido por su rinde, prorrateado por peso (factor) y por bolsas de la caja. null si no hay receta.
async function costoUnidadDesdeReceta(db: any, baseId: string, factor: number, bolsasCaja: number): Promise<number | null> {
  const { data: recipe } = await db
    .from("recipes")
    .select("id, yield_cajas, ingredients:recipe_ingredients(cantidad, insumo:insumos!insumo_id(precio_unitario))")
    .eq("product_id", baseId)
    .maybeSingle();
  if (!recipe) return null;

  const costoLote = (recipe.ingredients ?? []).reduce((s: number, ing: any) => {
    const precio = Number(ing.insumo?.precio_unitario ?? 0);
    return s + Number(ing.cantidad) * precio;
  }, 0);

  const yieldCajas = Number(recipe.yield_cajas) || 1;
  return ((costoLote / yieldCajas) * factor) / (bolsasCaja > 0 ? bolsasCaja : 1);
}

export type NuevaPresentacion = {
  name:         string;
  sku:          string;
  unit_label:   string;
  presentacion: string;
  kg_caja:      number;
  bolsas_caja:  number;
  u_bolsa:      number;
  pkg_unitario: number | null;
  pkg_bulto:    number | null;
  /** costo de materia prima por unidad; si es null se calcula desde la receta */
  costo:        number | null;
  linea_id:     number | null;
};

// Crea un producto nuevo ya vinculado a la receta del base. Queda INACTIVO: hay que revisar
// precios y activarlo en Productos (si no, aparecería en la tienda con precio 0).
export async function crearPresentacion(
  baseProductId: string,
  input: NuevaPresentacion,
): Promise<{ error: string } | { ok: true; id: string }> {
  await requireRole("admin");
  const db = createAdminClient() as any;

  const sku  = input.sku.trim().toUpperCase();
  const name = input.name.trim();
  const unitLabel = input.unit_label.trim();
  if (!sku)       return { error: "Ingresá el SKU" };
  if (!name)      return { error: "Ingresá el nombre" };
  if (!unitLabel) return { error: "Ingresá la unidad de venta (ej. caja 10 cajitas x 500g)" };
  if (!(input.kg_caja > 0))     return { error: "El kg por caja debe ser mayor a 0" };
  if (!(input.bolsas_caja >= 1)) return { error: "Las bolsas por caja deben ser al menos 1" };
  if (!(input.u_bolsa > 0))     return { error: "Las unidades por bolsa deben ser mayor a 0" };

  const [{ data: base }, { data: recetaBase }] = await Promise.all([
    db.from("products").select("*").eq("id", baseProductId).maybeSingle(),
    db.from("recipes").select("id").eq("product_id", baseProductId).maybeSingle(),
  ]);
  if (!base) return { error: "Producto base no encontrado" };
  if (!recetaBase) return { error: "El producto base no tiene receta cargada" };
  if (base.receta_producto_id) return { error: "El producto base usa la receta de otro producto" };
  const factor = factorABase(input.kg_caja, base.kg_caja);
  if (factor === null) return { error: "Cargá el kg por caja del producto base (en Productos) para poder calcular equivalencias" };

  const costo = input.costo !== null && input.costo > 0
    ? input.costo
    : await costoUnidadDesdeReceta(db, baseProductId, factor, input.bolsas_caja);

  const { data: creado, error } = await db
    .from("products")
    .insert({
      sku,
      slug:               sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      unit_label:         unitLabel,
      presentacion:       input.presentacion.trim() || null,
      kg_caja:            input.kg_caja,
      bolsas_caja:        input.bolsas_caja,
      u_bolsa:            input.u_bolsa,
      pkg_unitario:       input.pkg_unitario,
      pkg_bulto:          input.pkg_bulto,
      costo,
      linea_id:           input.linea_id ?? base.linea_id,
      receta_producto_id: baseProductId,
      // Se hereda del base lo que describe al producto
      category_id:        base.category_id,
      categoria:          base.categoria,
      short_description:  base.short_description,
      description:        base.description,
      cooking_methods:    base.cooking_methods ?? [],
      freezer_required:   base.freezer_required,
      cover_image_url:    base.cover_image_url,
      vida_util_dias:     base.vida_util_dias,
      mult_bolsas:        base.mult_bolsas,
      // Los precios no se copian: dependen del envase y se revisan antes de activarlo
      price_b2c:          0,
      price_b2b:          0,
      min_quantity_b2b:   1,
      stock_minimo:       0,
      is_active:          false,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: `Ya existe un producto con el SKU "${sku}". Usá otro código.` };
    return { error: error.message };
  }

  revalidateAll();
  revalidatePath(`/admin/cocina/recetas/${baseProductId}`);
  revalidatePath("/admin/productos");
  return { ok: true, id: creado.id };
}

export async function sincronizarCostoProducto(productId: string): Promise<ActionResult> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;

  const { data: product } = await db
    .from("products")
    .select("bolsas_caja, kg_caja, receta_producto_id")
    .eq("id", productId)
    .single();

  // Una presentación usa la receta del base; su costo por caja se prorratea por peso
  const baseId = (product?.receta_producto_id as string | null) ?? productId;
  let factor = 1;
  if (baseId !== productId) {
    const { data: base } = await db.from("products").select("kg_caja").eq("id", baseId).single();
    const f = factorABase(product?.kg_caja, base?.kg_caja);
    if (f === null) return { error: "Falta cargar el kg por caja de la presentación o del producto base." };
    factor = f;
  }

  const costoUnidad = await costoUnidadDesdeReceta(db, baseId, factor, Number(product?.bolsas_caja ?? 1) || 1);
  if (costoUnidad === null) return { error: "No hay receta cargada para este producto." };

  const { error } = await db.from("products").update({ costo: costoUnidad }).eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath("/admin/productos");
  revalidatePath("/admin/rentabilidad");
  revalidateAll();
  return { ok: true };
}
