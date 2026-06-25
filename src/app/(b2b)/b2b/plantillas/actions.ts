"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getB2BUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  return { user, supabase };
}

export async function guardarPlantilla(
  nombre: string,
  items: { productoId: string; cantidad: number }[]
): Promise<{ error?: string; id?: string }> {
  try {
    const { user, supabase } = await getB2BUser();

    if (!nombre.trim()) return { error: "El nombre es obligatorio" };
    if (items.length === 0) return { error: "La plantilla debe tener al menos un producto" };

    const { data: plantilla, error: pe } = await (supabase as any)
      .from("plantillas_pedido")
      .insert({ cliente_id: user.id, nombre: nombre.trim() })
      .select("id")
      .single();

    if (pe || !plantilla) return { error: pe?.message ?? "Error al guardar" };

    const { error: ie } = await (supabase as any)
      .from("plantilla_items")
      .insert(
        items.map(i => ({
          plantilla_id: plantilla.id,
          producto_id:  i.productoId,
          cantidad:     i.cantidad,
        }))
      );

    if (ie) {
      await (supabase as any).from("plantillas_pedido").delete().eq("id", plantilla.id);
      return { error: ie.message };
    }

    revalidatePath("/b2b/plantillas");
    return { id: plantilla.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function guardarPlantillaDesdeOrden(
  orderId: string,
  nombre: string
): Promise<{ error?: string }> {
  try {
    const { user, supabase } = await getB2BUser();
    if (!nombre.trim()) return { error: "El nombre es obligatorio" };

    const { data: lines, error: le } = await supabase
      .from("order_lines")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (le || !lines?.length) return { error: "No se pudieron cargar las líneas del pedido" };

    const { data: plantilla, error: pe } = await (supabase as any)
      .from("plantillas_pedido")
      .insert({ cliente_id: user.id, nombre: nombre.trim() })
      .select("id")
      .single();

    if (pe || !plantilla) return { error: pe?.message ?? "Error al guardar" };

    const { error: ie } = await (supabase as any)
      .from("plantilla_items")
      .insert(
        (lines as any[]).map((l: any) => ({
          plantilla_id: plantilla.id,
          producto_id:  l.product_id,
          cantidad:     l.quantity,
        }))
      );

    if (ie) {
      await (supabase as any).from("plantillas_pedido").delete().eq("id", plantilla.id);
      return { error: ie.message };
    }

    revalidatePath("/b2b/plantillas");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function eliminarPlantilla(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getB2BUser();
    const { error } = await (supabase as any).from("plantillas_pedido").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/b2b/plantillas");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getPlantillaItems(
  plantillaId: string
): Promise<{ error?: string; items?: { productoId: string; cantidad: number }[] }> {
  try {
    const { supabase } = await getB2BUser();
    const { data, error } = await (supabase as any)
      .from("plantilla_items")
      .select("producto_id, cantidad")
      .eq("plantilla_id", plantillaId);

    if (error) return { error: error.message };
    return {
      items: (data ?? []).map((i: any) => ({
        productoId: i.producto_id,
        cantidad:   i.cantidad,
      })),
    };
  } catch (e: any) {
    return { error: e.message };
  }
}
