"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { generarNumeroLote } from "@/lib/lotes";
import { factorABase, cajasPorLote, kgPorLote } from "@/lib/receta-base";
import { repartirLotes } from "@/lib/produccion-reparto";
import { revalidatePath } from "next/cache";

type Result =
  | { error: string }
  | { ok: true; id: string; numero_lote: string; items: { name: string; unit_label: string | null; cajas: number }[] };

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

  const recetaId      = formData.get("receta_id") as string;
  const cantLotes     = parseFloat((formData.get("cantidad_lotes") as string)?.replace(",", "."));
  const vidaUtilDias  = parseInt(formData.get("vida_util_dias") as string, 10) || 180;
  const fecha         = (formData.get("fecha") as string) || new Date().toISOString().slice(0, 10);
  const notas         = (formData.get("notas") as string)?.trim() || null;

  // Presentaciones en las que sale el batch: [{ producto_id, cajas }]
  let items: { producto_id: string; cajas?: number }[];
  try {
    const parsed = JSON.parse((formData.get("items") as string) || "[]");
    if (!Array.isArray(parsed)) throw new Error();
    items = parsed.map((i: any) => ({
      producto_id: String(i?.producto_id ?? ""),
      cajas:       i?.cajas !== undefined && i?.cajas !== null && i?.cajas !== "" ? Number(i.cajas) : undefined,
    }));
  } catch {
    return { error: "Las presentaciones no tienen un formato válido" };
  }

  if (!recetaId || items.length === 0 || items.some(i => !i.producto_id)) return { error: "Seleccioná un producto con receta y al menos una presentación" };
  if (new Set(items.map(i => i.producto_id)).size !== items.length) return { error: "No repitas la misma presentación: sumá las cajas en una sola línea" };
  if (isNaN(cantLotes) || cantLotes <= 0) return { error: "La cantidad de lotes debe ser mayor a 0" };
  if (items.some(i => i.cajas !== undefined && !(i.cajas > 0))) return { error: "Las cajas de cada presentación deben ser mayores a 0" };

  // El rendimiento se calcula acá con datos de la base, no con lo que mande el cliente
  const { data: receta } = await db
    .from("recipes")
    .select("id, product_id, yield_cajas")
    .eq("id", recetaId)
    .maybeSingle();
  if (!receta) return { error: "La receta no existe" };
  const yieldCajas = Number(receta.yield_cajas);
  if (!(yieldCajas > 0)) return { error: "La receta no tiene rendimiento configurado" };

  const [{ data: presentaciones }, { data: base }] = await Promise.all([
    db.from("products").select("id, name, unit_label, kg_caja, receta_producto_id").in("id", items.map(i => i.producto_id)),
    db.from("products").select("kg_caja").eq("id", receta.product_id).single(),
  ]);
  const presPorId: Record<string, any> = Object.fromEntries((presentaciones ?? []).map((p: any) => [p.id, p]));

  type Linea = { pres: any; cajas: number; kg: number | null };
  const lineas: Linea[] = [];
  for (const it of items) {
    const pres = presPorId[it.producto_id];
    if (!pres) return { error: "Una de las presentaciones no existe" };

    let factor: number | null;
    if (pres.id === receta.product_id) factor = 1;
    else if (pres.receta_producto_id === receta.product_id) factor = factorABase(pres.kg_caja, base?.kg_caja);
    else return { error: `"${pres.name}" no usa esta receta` };

    // Sin cajas informadas (solo válido con una única presentación) se calcula por peso
    let cajas = it.cajas;
    if (cajas === undefined) {
      const calc = items.length === 1 ? cajasPorLote(yieldCajas, factor) : null;
      if (calc === null) return { error: `Ingresá las cajas de "${pres.name}" (falta el kg por caja para calcularlas)` };
      cajas = Math.round(cantLotes * calc * 100) / 100;
    }

    const kgCaja = Number(pres.kg_caja);
    lineas.push({ pres, cajas, kg: kgCaja > 0 ? cajas * kgCaja : null });
  }

  // Los insumos se descuentan una sola vez por batch: los lotes de receta se reparten entre
  // las presentaciones en proporción a sus kg (una fila de produccion por presentación).
  let lotesPorLinea: number[];
  if (lineas.length === 1) {
    lotesPorLinea = [cantLotes];
  } else {
    if (lineas.some(l => l.kg === null)) return { error: "Para repartir el batch en varias presentaciones todas necesitan kg por caja cargado (en Productos)" };
    lotesPorLinea = repartirLotes(cantLotes, lineas.map(l => l.kg as number));
  }

  // 1. Registrar producción en una sola sentencia (trigger descuenta insumos según cantidad_lotes)
  const { data: prods, error: errProd } = await db
    .from("produccion")
    .insert(lineas.map((l, i) => ({
      producto_id:    l.pres.id,
      receta_id:      recetaId,
      cantidad_cajas: l.cajas,
      cantidad_lotes: lotesPorLinea[i],
      fecha,
      notas,
      created_by: user.id,
    })))
    .select("id");

  if (errProd) return { error: errProd.message };

  // 2. Un lote por presentación, con el mismo número: es el mismo batch
  const numero_lote = await generarNumeroLote(db);

  const fechaObj = new Date(fecha + "T12:00:00");
  fechaObj.setDate(fechaObj.getDate() + vidaUtilDias);
  const fechaVenc = fechaObj.toISOString().slice(0, 10);

  // La cantidad queda en cajas (pedidos, precios y consumo FEFO también están en cajas);
  // la etiqueta de unidad es el unit_label de cada presentación.
  const { error: errLote } = await db.from("lotes").insert(lineas.map(l => ({
    producto_id:       l.pres.id,
    numero_lote,
    fecha_ingreso:     fecha,
    fecha_vencimiento: fechaVenc,
    cantidad_inicial:  l.cajas,
    cantidad_actual:   l.cajas,
    unidad:            l.pres.unit_label?.trim() || "cajas",
    observaciones:     notas,
    created_by:        user.id,
  })));

  if (errLote) {
    // No revertir la producción, solo advertir
    console.error("Error al crear lote:", errLote.message);
  }

  revalidateAll();
  return {
    ok: true,
    id: prods?.[0]?.id ?? "",
    numero_lote,
    items: lineas.map(l => ({ name: l.pres.name, unit_label: l.pres.unit_label ?? null, cajas: l.cajas })),
  };
}

export type Presentacion = {
  id:             string;
  name:           string;
  sku:            string | null;
  unit_label:     string | null;
  es_base:        boolean;
  /** kg de una caja de esta presentación (null si no está cargado) */
  kg_caja:        number | null;
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
        kg_caja:        Number(p.kg_caja) > 0 ? Number(p.kg_caja) : null,
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
