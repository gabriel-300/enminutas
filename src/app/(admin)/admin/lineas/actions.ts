"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function crearLinea(nombre: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { data: last } = await db.from("lineas_producto").select("orden").order("orden", { ascending: false }).limit(1).single();
    const orden = (last?.orden ?? 0) + 1;
    const { error } = await db.from("lineas_producto").insert({ nombre: nombre.trim(), orden });
    if (error) {
      if (error.code === "23505") return { error: `La línea "${nombre.trim()}" ya existe.` };
      return { error: error.message };
    }
    revalidatePath("/admin/lineas");
    revalidatePath("/admin/productos");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function editarLinea(id: number, nombre: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { error } = await db.from("lineas_producto").update({ nombre: nombre.trim() }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/lineas");
    revalidatePath("/admin/productos");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

// Visible en el catálogo B2B: el catálogo muestra las líneas que tienen una fila en disponibilidad_lineas con disponible = true.
// Ocultar no borra el historial: deja disponible = false.
export async function setLineaVisibleB2B(id: number, visible: boolean): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { data: filas, error: errLectura } = await db.from("disponibilidad_lineas").select("id, disponible").eq("linea_id", id);
    if (errLectura) return { error: errLectura.message };
    const lista = (filas ?? []) as { id: string; disponible: boolean }[];

    if (visible) {
      if (!lista.some(f => f.disponible)) {
        const { error } = lista.length > 0
          ? await db.from("disponibilidad_lineas").update({ disponible: true, hasta: null }).in("id", lista.map(f => f.id))
          : await db.from("disponibilidad_lineas").insert({ linea_id: id, disponible: true });
        if (error) return { error: error.message };
      }
    } else {
      const { error } = await db.from("disponibilidad_lineas").update({ disponible: false }).eq("linea_id", id).eq("disponible", true);
      if (error) return { error: error.message };
    }
    revalidatePath("/admin/lineas");
    revalidatePath("/b2b/catalogo");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function eliminarLinea(id: number): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("linea_id", id);
    if ((count ?? 0) > 0) return { error: `No se puede eliminar: hay ${count} producto(s) con esta línea.` };
    const { error } = await db.from("lineas_producto").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/lineas");
    revalidatePath("/admin/productos");
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
