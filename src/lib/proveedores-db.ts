import { claveProveedor, normalizarCuit } from "@/lib/proveedores";

// Busca el proveedor por CUIT y, si no, por nombre unificado (sin mayúsculas/acentos/"SRL");
// si no existe lo da de alta. Así "El Abasto" y "el Abasto srl" son el mismo proveedor.
// `db` es el cliente admin de Supabase (solo se usa desde Server Actions).
export async function resolverProveedor(
  db: any, nombre: string, cuitCrudo: string | null,
): Promise<{ id: string; nombre: string; cuit: string | null } | { error: string }> {
  const cuit = normalizarCuit(cuitCrudo);
  const { data } = await db.from("proveedores").select("id, nombre, cuit");
  const todos = (data ?? []) as { id: string; nombre: string; cuit: string | null }[];

  const existente = (cuit && todos.find(p => p.cuit === cuit))
    || todos.find(p => claveProveedor(p.nombre) === claveProveedor(nombre));
  if (existente) {
    // Si el proveedor no tenía CUIT y este comprobante lo trae, se completa.
    if (!existente.cuit && cuit) {
      await db.from("proveedores").update({ cuit }).eq("id", existente.id);
      existente.cuit = cuit;
    }
    return existente;
  }

  const { data: nuevo, error } = await db
    .from("proveedores").insert({ nombre: nombre.trim(), cuit }).select("id, nombre, cuit").single();
  if (error) return { error: error.message };
  return nuevo;
}
