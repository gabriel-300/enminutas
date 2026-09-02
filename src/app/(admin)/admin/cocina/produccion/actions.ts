"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true; id: string };

function revalidateAll() {
  revalidatePath("/admin/cocina/produccion");
  revalidatePath("/admin/cocina/insumos");
  revalidatePath("/admin/cocina/recetas");
}

export async function registrarProduccion(formData: FormData): Promise<Result> {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const productoId  = formData.get("producto_id") as string;
  const recetaId    = formData.get("receta_id") as string;
  const cantCajas   = parseFloat((formData.get("cantidad_cajas") as string)?.replace(",", "."));
  const fecha       = formData.get("fecha") as string;
  const notas       = (formData.get("notas") as string)?.trim() || null;

  if (!productoId || !recetaId) return { error: "Seleccioná un producto con receta" };
  if (isNaN(cantCajas) || cantCajas <= 0) return { error: "La cantidad de cajas debe ser mayor a 0" };

  const { data, error } = await adminClient
    .from("produccion")
    .insert({
      producto_id:    productoId,
      receta_id:      recetaId,
      cantidad_cajas: cantCajas,
      fecha:          fecha || new Date().toISOString().slice(0, 10),
      notas,
      created_by:     user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true, id: data.id };
}

export type ProductoConReceta = {
  id: string;
  name: string;
  sku: string | null;
  bolsas_caja: number;
  receta: {
    id: string;
    yield_cajas: number;
    ingredients: { insumo_id: string; cantidad: number; insumo: { nombre: string; unidad: string; stock_actual: number } | null }[];
  } | null;
};

export async function getProductosConReceta(): Promise<ProductoConReceta[]> {
  const db = createAdminClient() as any;

  const { data: products } = await db
    .from("products")
    .select("id, name, sku, bolsas_caja")
    .eq("is_active", true)
    .order("name");

  if (!products?.length) return [];

  const { data: recipes } = await db
    .from("recipes")
    .select("id, product_id, yield_cajas");

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
      id: r.id,
      yield_cajas: Number(r.yield_cajas),
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
      id:          p.id,
      name:        p.name,
      sku:         p.sku,
      bolsas_caja: Number(p.bolsas_caja ?? 1),
      receta:      recipeByProduct[p.id] ?? null,
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
