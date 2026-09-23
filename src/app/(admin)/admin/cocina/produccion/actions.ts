"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { generarNumeroLote } from "@/lib/lotes";
import { factorABase, cajasPorLote, kgPorLote } from "@/lib/receta-base";
import { revalidatePath } from "next/cache";

type Result = { error: string } | { ok: true; id: string; numero_lote: string; cajas: number };

// Pedidos que todavía necesitan producto terminado (mismo criterio que Planificador y Compras)
const ESTADOS_PENDIENTES = ["aprobado", "enviado_prod"];

function revalidateAll() {
  revalidatePath("/admin/cocina");
  revalidatePath("/admin/cocina/produccion");
  revalidatePath("/admin/cocina/insumos");
  revalidatePath("/admin/cocina/recetas");
  revalidatePath("/admin/lotes");
  revalidatePath("/admin/stock");
}

export async function registrarProduccion(formData: FormData): Promise<Result> {
  const db          = createAdminClient() as any;

  let user;
  try { user = await requireRole("admin", "produccion"); } catch { return { error: "No autorizado" }; }

  // producto_id = presentación que se produce (puede ser el producto de la receta u otra presentación vinculada)
  const productoId    = formData.get("producto_id") as string;
  const recetaId      = formData.get("receta_id") as string;
  const cantLotes     = parseFloat((formData.get("cantidad_lotes") as string)?.replace(",", "."));
  const cajasRealesRaw = (formData.get("cajas_reales") as string | null)?.replace(",", ".");
  const cajasReales   = cajasRealesRaw ? parseFloat(cajasRealesRaw) : NaN;
  const vidaUtilDias  = parseInt(formData.get("vida_util_dias") as string, 10) || 180;
  const fecha         = (formData.get("fecha") as string) || new Date().toISOString().slice(0, 10);
  const notas         = (formData.get("notas") as string)?.trim() || null;

  if (!productoId || !recetaId) return { error: "Seleccioná un producto con receta" };
  if (isNaN(cantLotes) || cantLotes <= 0) return { error: "La cantidad de lotes debe ser mayor a 0" };

  // El rendimiento se calcula acá con datos de la base, no con lo que mande el cliente
  const { data: receta } = await db
    .from("recipes")
    .select("id, product_id, yield_cajas")
    .eq("id", recetaId)
    .maybeSingle();
  if (!receta) return { error: "La receta no existe" };
  const yieldCajas = Number(receta.yield_cajas);
  if (!(yieldCajas > 0)) return { error: "La receta no tiene rendimiento configurado" };

  const { data: presentacion } = await db
    .from("products")
    .select("id, unit_label, kg_caja, receta_producto_id")
    .eq("id", productoId)
    .maybeSingle();
  if (!presentacion) return { error: "La presentación no existe" };

  let factor: number | null;
  if (presentacion.id === receta.product_id) {
    factor = 1;
  } else if (presentacion.receta_producto_id === receta.product_id) {
    const { data: base } = await db.from("products").select("kg_caja").eq("id", receta.product_id).single();
    factor = factorABase(presentacion.kg_caja, base?.kg_caja);
  } else {
    return { error: "Esa presentación no usa esta receta" };
  }

  const cajasCalculadas = cajasPorLote(yieldCajas, factor);
  if (cajasCalculadas === null) {
    return { error: "Falta cargar el kg por caja de la presentación o del producto base para calcular el rendimiento" };
  }

  const cantCajas = !isNaN(cajasReales) && cajasReales > 0
    ? cajasReales
    : Math.round(cantLotes * cajasCalculadas * 100) / 100;
  if (!(cantCajas > 0)) return { error: "La cantidad de cajas debe ser mayor a 0" };

  // Etiqueta de la unidad de stock del lote = unit_label de la presentación (no "cajas" fijo),
  // para que sea consistente con los lotes cargados manualmente.
  // La cantidad queda en cajas: pedidos, precios y consumo FEFO también están en cajas.
  const unidadLote = presentacion.unit_label?.trim() || "cajas";

  // 1. Registrar producción (trigger descuenta insumos según cantidad_lotes)
  const { data: prod, error: errProd } = await db
    .from("produccion")
    .insert({
      producto_id:    productoId,
      receta_id:      recetaId,
      cantidad_cajas: cantCajas,
      cantidad_lotes: cantLotes,
      fecha,
      notas,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (errProd) return { error: errProd.message };

  // 2. Generar número de lote y crear entrada en lotes
  const numero_lote = await generarNumeroLote(db);

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
    unidad:           unidadLote,
    observaciones:    notas,
    created_by:       user.id,
  });

  if (errLote) {
    // No revertir la producción, solo advertir
    console.error("Error al crear lote:", errLote.message);
  }

  revalidateAll();
  return { ok: true, id: prod.id, numero_lote, cajas: cantCajas };
}

export type Presentacion = {
  id:             string;
  name:           string;
  sku:            string | null;
  unit_label:     string | null;
  es_base:        boolean;
  /** Cajas de esta presentación que rinde 1 lote (null si falta kg_caja) */
  cajas_por_lote: number | null;
  stock:          number;
  /** demanda de pedidos pendientes + stock mínimo − stock, en cajas de esta presentación */
  faltante:       number;
};

export type ProductoConReceta = {
  /** producto dueño de la receta */
  id: string;
  name: string;
  sku: string | null;
  vida_util_dias: number;
  presentaciones: Presentacion[];
  /** presentación con mayor faltante (null si no falta ninguna) */
  sugerida_id: string | null;
  receta: {
    id:             string;
    yield_cajas:    number;
    kg_lote:        number | null;
    vida_util_dias: number;
    ingredients: {
      insumo_id: string;
      cantidad: number;
      insumo: { nombre: string; unidad: string; stock_actual: number } | null;
    }[];
  };
};

export async function getProductosConReceta(): Promise<ProductoConReceta[]> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;

  // Incluye inactivos: el dueño de la receta puede estar inactivo aunque sus presentaciones no
  const { data: products } = await db
    .from("products")
    .select("id, name, sku, unit_label, kg_caja, is_active, receta_producto_id, stock_minimo");

  if (!products?.length) return [];

  const { data: recipes } = await db
    .from("recipes")
    .select("id, product_id, yield_cajas, vida_util_dias");

  if (!recipes?.length) return [];

  const recipeIds = recipes.map((r: any) => r.id);

  const [{ data: ingredients }, { data: lotes }, { data: pedidosPend }] = await Promise.all([
    db
      .from("recipe_ingredients")
      .select("recipe_id, insumo_id, cantidad, insumo:insumos!insumo_id(nombre, unidad, stock_actual)")
      .in("recipe_id", recipeIds)
      .not("insumo_id", "is", null),
    db
      .from("lotes")
      .select("producto_id, cantidad_actual")
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${new Date().toISOString().slice(0, 10)}`),
    db
      .from("orders")
      .select("id")
      .in("status", ESTADOS_PENDIENTES),
  ]);

  const pendIds = (pedidosPend ?? []).map((o: any) => o.id as string);
  const { data: lineasPend } = pendIds.length > 0
    ? await db.from("order_lines").select("product_id, quantity").in("order_id", pendIds)
    : { data: [] };

  const stockMap: Record<string, number> = {};
  for (const l of lotes ?? []) stockMap[l.producto_id] = (stockMap[l.producto_id] ?? 0) + Number(l.cantidad_actual);
  const demandaMap: Record<string, number> = {};
  for (const l of lineasPend ?? []) {
    if (!l.product_id) continue;
    demandaMap[l.product_id] = (demandaMap[l.product_id] ?? 0) + Number(l.quantity);
  }

  const ingByRecipe: Record<string, any[]> = {};
  for (const ing of ingredients ?? []) {
    if (!ingByRecipe[ing.recipe_id]) ingByRecipe[ing.recipe_id] = [];
    ingByRecipe[ing.recipe_id].push(ing);
  }

  const productById: Record<string, any> = Object.fromEntries(products.map((p: any) => [p.id, p]));

  const out: ProductoConReceta[] = [];
  for (const r of recipes) {
    const base = productById[r.product_id];
    if (!base) continue;

    const yieldCajas = Number(r.yield_cajas);
    const miembros = [base, ...products.filter((p: any) => p.receta_producto_id === base.id)]
      .filter((p: any) => p.is_active);
    if (miembros.length === 0) continue;

    const presentaciones: Presentacion[] = miembros.map((p: any) => {
      const factor = p.id === base.id ? 1 : factorABase(p.kg_caja, base.kg_caja);
      const stock  = stockMap[p.id] ?? 0;
      return {
        id:             p.id,
        name:           p.name,
        sku:            p.sku,
        unit_label:     p.unit_label,
        es_base:        p.id === base.id,
        cajas_por_lote: cajasPorLote(yieldCajas, factor),
        stock,
        faltante:       Math.max((demandaMap[p.id] ?? 0) + Number(p.stock_minimo ?? 0) - stock, 0),
      };
    });

    const conFaltante = presentaciones.filter(p => p.faltante > 0);
    const sugerida = conFaltante.sort((a, b) => b.faltante - a.faltante)[0] ?? null;

    out.push({
      id:             base.id,
      name:           base.name,
      sku:            base.sku,
      vida_util_dias: Number(r.vida_util_dias ?? 180),
      presentaciones,
      sugerida_id:    sugerida?.id ?? null,
      receta: {
        id:             r.id,
        yield_cajas:    yieldCajas,
        kg_lote:        kgPorLote(yieldCajas, base.kg_caja),
        vida_util_dias: Number(r.vida_util_dias ?? 180),
        ingredients: (ingByRecipe[r.id] ?? []).map((ing: any) => ({
          insumo_id: ing.insumo_id,
          cantidad:  Number(ing.cantidad),
          insumo:    ing.insumo
            ? { nombre: ing.insumo.nombre, unidad: ing.insumo.unidad, stock_actual: Number(ing.insumo.stock_actual ?? 0) }
            : null,
        })),
      },
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export type ProduccionHistorial = {
  id: string;
  fecha: string;
  cantidad_cajas: number;
  notas: string | null;
  created_at: string;
  producto: { name: string; sku: string | null; unit_label: string | null } | null;
};

export async function getHistorialProduccion(limit = 30): Promise<ProduccionHistorial[]> {
  await requireRole("admin", "produccion");
  const db = createAdminClient() as any;
  const { data } = await db
    .from("produccion")
    .select("id, fecha, cantidad_cajas, notas, created_at, producto:products!producto_id(name, sku, unit_label)")
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
