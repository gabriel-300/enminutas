import { factorABase } from "@/lib/receta-base";

export type ProductoAfectado = {
  id: string;
  name: string;
  costoCajaAntes: number;
  costoCajaDespues: number;
  deltaPct: number;
};

// Registra el cambio si el precio realmente difiere (evita ruido por re-guardar el mismo valor).
export async function registrarCambioPrecioInsumo(
  db: any,
  insumoId: string,
  precioAnterior: number,
  precioNuevo: number,
  origen: "manual" | "csv" | "recepcion",
  creadoPor: string,
  referenciaId?: string | null,
): Promise<void> {
  if (Math.round(Number(precioAnterior) * 10000) === Math.round(Number(precioNuevo) * 10000)) return;
  await db.from("insumos_precio_historial").insert({
    insumo_id:       insumoId,
    precio_anterior: precioAnterior,
    precio_nuevo:    precioNuevo,
    origen,
    referencia_id:   referenciaId ?? null,
    creado_por:      creadoPor,
  });
}

// Qué productos (base o presentación) usan este insumo en su receta, y cómo les cambia el costo
// por caja con el precio nuevo -- para avisar antes de que alguien note el margen roto después.
export async function productosAfectadosPorInsumo(
  db: any,
  insumoId: string,
  precioNuevo: number,
): Promise<ProductoAfectado[]> {
  const { data: ingRows } = await db.from("recipe_ingredients").select("recipe_id").eq("insumo_id", insumoId);
  const recipeIds = Array.from(new Set(((ingRows ?? []) as any[]).map((r) => r.recipe_id)));
  if (recipeIds.length === 0) return [];

  const [{ data: recipes }, { data: allProducts }] = await Promise.all([
    db.from("recipes").select("id, product_id, yield_cajas, ingredients:recipe_ingredients(cantidad, insumo_id, insumo:insumos!insumo_id(precio_unitario))").in("id", recipeIds),
    db.from("products").select("id, name, kg_caja, receta_producto_id").eq("is_active", true),
  ]);

  const products = (allProducts ?? []) as any[];
  const resultados: ProductoAfectado[] = [];

  for (const r of (recipes ?? []) as any[]) {
    const yieldCajas = Number(r.yield_cajas) || 1;
    const ingredientes = (r.ingredients ?? []) as any[];
    const costoLoteAntes = ingredientes.reduce((s, ing) => s + Number(ing.cantidad) * Number(ing.insumo?.precio_unitario ?? 0), 0);
    const costoLoteDespues = ingredientes.reduce(
      (s, ing) => s + Number(ing.cantidad) * (ing.insumo_id === insumoId ? precioNuevo : Number(ing.insumo?.precio_unitario ?? 0)), 0,
    );

    const base = products.find((p) => p.id === r.product_id);
    if (!base) continue;
    const miembros = [base, ...products.filter((p) => p.receta_producto_id === base.id)];

    for (const p of miembros) {
      const factor = p.id === base.id ? 1 : factorABase(p.kg_caja, base.kg_caja);
      if (factor === null) continue;
      const antes = (costoLoteAntes / yieldCajas) * factor;
      const despues = (costoLoteDespues / yieldCajas) * factor;
      if (Math.abs(despues - antes) < 0.01) continue;
      resultados.push({
        id: p.id,
        name: p.name,
        costoCajaAntes: antes,
        costoCajaDespues: despues,
        deltaPct: antes > 0 ? ((despues - antes) / antes) * 100 : 0,
      });
    }
  }

  return resultados;
}

export type HistorialPrecioInsumo = {
  id: string;
  precioAnterior: number;
  precioNuevo: number;
  origen: "manual" | "csv" | "recepcion";
  creadoPorNombre: string | null;
  createdAt: string;
};

export async function getHistorialPrecioInsumo(db: any, insumoId: string, limit = 20): Promise<HistorialPrecioInsumo[]> {
  const { data } = await db
    .from("insumos_precio_historial")
    .select("id, precio_anterior, precio_nuevo, origen, creado_por, created_at")
    .eq("insumo_id", insumoId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as any[];
  const ids = Array.from(new Set(rows.map((r) => r.creado_por)));
  const { data: perfiles } = ids.length > 0
    ? await db.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const nombrePorId: Record<string, string> = Object.fromEntries(((perfiles ?? []) as any[]).map((p) => [p.id, p.full_name ?? p.id]));

  return rows.map((r) => ({
    id:              r.id,
    precioAnterior:  Number(r.precio_anterior),
    precioNuevo:     Number(r.precio_nuevo),
    origen:          r.origen,
    creadoPorNombre: nombrePorId[r.creado_por] ?? null,
    createdAt:       r.created_at,
  }));
}
