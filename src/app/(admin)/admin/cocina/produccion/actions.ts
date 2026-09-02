"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true; id: string; numero_lote: string };

function revalidateAll() {
  revalidatePath("/admin/cocina/produccion");
  revalidatePath("/admin/cocina/insumos");
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/lotes");
}

// Genera número de lote: P-YYYYMMDD-NNN (correlativo del día)
async function generarNumeroLote(db: any, fecha: string): Promise<string> {
  const fechaStr = fecha.replace(/-/g, ""); // YYYYMMDD
  const prefijo  = `P-${fechaStr}-`;
  const { data } = await db
    .from("lotes")
    .select("numero_lote")
    .like("numero_lote", `${prefijo}%`)
    .order("numero_lote", { ascending: false })
    .limit(1);
  const ultimo = data?.[0]?.numero_lote as string | undefined;
  const seq = ultimo
    ? parseInt(ultimo.slice(prefijo.length), 10) + 1
    : 1;
  return `${prefijo}${String(seq).padStart(3, "0")}`;
}

export async function registrarProduccion(formData: FormData): Promise<Result> {
  const supabase    = await createClient();
  const db          = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const productoId    = formData.get("producto_id") as string;
  const recetaId      = formData.get("receta_id") as string;
  const cantLotes     = parseFloat((formData.get("cantidad_lotes") as string)?.replace(",", "."));
  const yieldCajas    = parseFloat(formData.get("yield_cajas") as string);
  const vidaUtilDias  = parseInt(formData.get("vida_util_dias") as string, 10) || 180;
  const fecha         = (formData.get("fecha") as string) || new Date().toISOString().slice(0, 10);
  const notas         = (formData.get("notas") as string)?.trim() || null;

  if (!productoId || !recetaId) return { error: "Seleccioná un producto con receta" };
  if (isNaN(cantLotes) || cantLotes <= 0) return { error: "La cantidad de lotes debe ser mayor a 0" };
  if (isNaN(yieldCajas) || yieldCajas <= 0) return { error: "La receta no tiene rendimiento configurado" };

  const cantCajas = cantLotes * yieldCajas;

  // 1. Registrar producción (trigger descuenta insumos automáticamente)
  const { data: prod, error: errProd } = await db
    .from("produccion")
    .insert({
      producto_id:    productoId,
      receta_id:      recetaId,
      cantidad_cajas: cantCajas,
      fecha,
      notas,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (errProd) return { error: errProd.message };

  // 2. Generar número de lote y crear entrada en lotes
  const numero_lote = await generarNumeroLote(db, fecha);

  // Calcular fecha de vencimiento
  const fechaObj = new Date(fecha + "T12:00:00");
  fechaObj.setDate(fechaObj.getDate() + vidaUtilDias);
  const fechaVenc = fechaObj.toISOString().slice(0, 10);

  const { error: errLote } = await db.from("lotes").insert({
    producto_id:      productoId,
    numero_lote,
    fecha_ingreso:    fecha,
    fecha_vencimiento: fechaVenc,
    cantidad_inicial: cantCajas,
    cantidad_actual:  cantCajas,
    unidad:           "cajas",
    observaciones:    notas,
    created_by:       user.id,
  });

  if (errLote) {
    // No revertir la producción, solo advertir
    console.error("Error al crear lote:", errLote.message);
  }

  revalidateAll();
  return { ok: true, id: prod.id, numero_lote };
}

export type ProductoConReceta = {
  id: string;
  name: string;
  sku: string | null;
  bolsas_caja: number;
  vida_util_dias: number;
  receta: {
    id:             string;
    yield_cajas:    number;
    vida_util_dias: number;
    ingredients: {
      insumo_id: string;
      cantidad: number;
      insumo: { nombre: string; unidad: string; stock_actual: number } | null;
    }[];
  } | null;
};

export async function getProductosConReceta(): Promise<ProductoConReceta[]> {
  const db = createAdminClient() as any;

  const { data: products } = await db
    .from("products")
    .select("id, name, sku, bolsas_caja, vida_util_dias")
    .eq("is_active", true)
    .order("name");

  if (!products?.length) return [];

  const { data: recipes } = await db
    .from("recipes")
    .select("id, product_id, yield_cajas, vida_util_dias");

  if (!recipes?.length) return [];

  const recipeIds = recipes.map((r: any) => r.id);

  const { data: ingredients } = await db
    .from("recipe_ingredients")
    .select("recipe_id, insumo_id, cantidad, insumo:insumos!insumo_id(nombre, unidad, stock_actual)")
    .in("recipe_id", recipeIds)
    .not("insumo_id", "is", null);

  const ingByRecipe: Record<string, any[]> = {};
  for (const ing of ingredients ?? []) {
    if (!ingByRecipe[ing.recipe_id]) ingByRecipe[ing.recipe_id] = [];
    ingByRecipe[ing.recipe_id].push(ing);
  }

  const recipeByProduct: Record<string, any> = {};
  for (const r of recipes) {
    recipeByProduct[r.product_id] = {
      id:             r.id,
      yield_cajas:    Number(r.yield_cajas),
      vida_util_dias: Number(r.vida_util_dias ?? 180),
      ingredients: (ingByRecipe[r.id] ?? []).map((ing: any) => ({
        insumo_id: ing.insumo_id,
        cantidad:  Number(ing.cantidad),
        insumo:    ing.insumo
          ? { nombre: ing.insumo.nombre, unidad: ing.insumo.unidad, stock_actual: Number(ing.insumo.stock_actual ?? 0) }
          : null,
      })),
    };
  }

  return products
    .filter((p: any) => recipeByProduct[p.id])
    .map((p: any) => ({
      id:             p.id,
      name:           p.name,
      sku:            p.sku,
      bolsas_caja:    Number(p.bolsas_caja ?? 1),
      vida_util_dias: recipeByProduct[p.id]?.vida_util_dias ?? 180,
      receta:         recipeByProduct[p.id] ?? null,
    }));
}

export type ProduccionHistorial = {
  id: string;
  fecha: string;
  cantidad_cajas: number;
  notas: string | null;
  created_at: string;
  producto: { name: string; sku: string | null } | null;
};

export async function getHistorialProduccion(limit = 30): Promise<ProduccionHistorial[]> {
  const db = createAdminClient() as any;
  const { data } = await db
    .from("produccion")
    .select("id, fecha, cantidad_cajas, notas, created_at, producto:products!producto_id(name, sku)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as any[]).map(r => ({
    id:             r.id,
    fecha:          r.fecha,
    cantidad_cajas: Number(r.cantidad_cajas),
    notas:          r.notas,
    created_at:     r.created_at,
    producto:       r.producto ?? null,
  }));
}
