"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { aprobadoresConfigurados, puedeAprobar } from "@/lib/aprobadores";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { error: string };

function revalidar() {
  revalidatePath("/admin/ajustes-internos");
  revalidatePath("/admin/cuentas-corrientes");
  revalidatePath("/admin/proveedores");
}

export type TipoAjuste   = "debito" | "credito";
export type EstadoAjuste = "pendiente" | "aprobado" | "rechazado";

export type AjusteInput = {
  tipo:        TipoAjuste;
  clienteId?:  string | null;
  proveedorId?: string | null;
  referencia?: string | null;
  monto:       number;
  motivo:      string;
};

// Carga un DRI (débito interno) o CRI (crédito interno). No toca el cobro/pago que corrige: queda
// pendiente hasta que alguien autorizado lo aprueba, recién ahí entra en deuda_clientes()/proveedores_saldos().
export async function crearAjusteInterno(input: AjusteInput): Promise<{ error: string } | { ok: true; id: string }> {
  try {
    const user = await requireAdmin();

    if (input.tipo !== "debito" && input.tipo !== "credito") return { error: "Tipo inválido" };
    const monto = Math.round(Number(input.monto) * 100) / 100;
    if (!Number.isFinite(monto) || monto <= 0) return { error: "El monto debe ser mayor a cero" };
    const motivo = input.motivo?.trim();
    if (!motivo) return { error: "El motivo es obligatorio" };

    const clienteId   = input.clienteId?.trim() || null;
    const proveedorId = input.proveedorId?.trim() || null;
    if (!clienteId && !proveedorId) return { error: "Elegí un cliente o un proveedor" };
    if (clienteId && proveedorId)   return { error: "Elegí cliente o proveedor, no los dos" };

    const db = createAdminClient() as any;
    const { data, error } = await db.from("ajustes_internos").insert({
      tipo:         input.tipo,
      cliente_id:   clienteId,
      proveedor_id: proveedorId,
      referencia:   input.referencia?.trim() || null,
      monto,
      motivo,
      estado:       "pendiente",
      creado_por:   user.id,
    }).select("id").single();
    if (error) return { error: error.message };

    revalidar();
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function aprobarAjusteInterno(id: string): Promise<Result> {
  try {
    const user = await requireAdmin();
    if (!puedeAprobar(user.email)) return { error: "Tu usuario no está autorizado a aprobar ajustes internos" };

    const db = createAdminClient() as any;
    // Separación de funciones: sin lista de aprobadores configurada, quien carga el ajuste no lo aprueba.
    if (!aprobadoresConfigurados()) {
      const { data: a } = await db.from("ajustes_internos").select("creado_por").eq("id", id).single();
      if (a?.creado_por === user.id) return { error: "No podés aprobar un ajuste que cargaste vos" };
    }

    const { data, error } = await db.from("ajustes_internos")
      .update({ estado: "aprobado", aprobado_por: user.id, aprobado_at: new Date().toISOString() })
      .eq("id", id).eq("estado", "pendiente")
      .select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "El ajuste no está pendiente" };

    revalidar();
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function rechazarAjusteInterno(id: string): Promise<Result> {
  try {
    const user = await requireAdmin();
    if (!puedeAprobar(user.email)) return { error: "Tu usuario no está autorizado a rechazar ajustes internos" };

    const db = createAdminClient() as any;
    const { data, error } = await db.from("ajustes_internos")
      .update({ estado: "rechazado", aprobado_por: user.id, aprobado_at: new Date().toISOString() })
      .eq("id", id).eq("estado", "pendiente")
      .select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "El ajuste no está pendiente" };

    revalidar();
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export type AjusteRow = {
  id:                string;
  tipo:               TipoAjuste;
  clienteId:          string | null;
  clienteNombre:      string | null;
  proveedorId:        string | null;
  proveedorNombre:    string | null;
  referencia:         string | null;
  monto:              number;
  motivo:             string;
  estado:             EstadoAjuste;
  creadoPorNombre:    string | null;
  aprobadoPorNombre:  string | null;
  createdAt:          string;
};

async function nombresPorId(db: any, ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await db.from("profiles").select("id, full_name").in("id", ids);
  return Object.fromEntries(((data ?? []) as any[]).map((p) => [p.id, p.full_name ?? p.id]));
}

export async function listarAjustesInternos(): Promise<AjusteRow[]> {
  await requireAdmin();
  const db = createAdminClient() as any;

  const { data, error } = await db
    .from("ajustes_internos")
    .select(`
      id, tipo, cliente_id, proveedor_id, referencia, monto, motivo, estado, created_at, creado_por, aprobado_por,
      cliente:profiles!cliente_id (full_name),
      proveedor:proveedores!proveedor_id (nombre)
    `)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  const personas = await nombresPorId(db, Array.from(new Set(rows.flatMap((r) => [r.creado_por, r.aprobado_por]).filter(Boolean))));

  return rows.map((r) => ({
    id:               r.id,
    tipo:              r.tipo,
    clienteId:         r.cliente_id,
    clienteNombre:     r.cliente?.full_name ?? null,
    proveedorId:       r.proveedor_id,
    proveedorNombre:   r.proveedor?.nombre ?? null,
    referencia:        r.referencia,
    monto:             Number(r.monto),
    motivo:            r.motivo,
    estado:            r.estado,
    creadoPorNombre:   personas[r.creado_por] ?? null,
    aprobadoPorNombre: r.aprobado_por ? (personas[r.aprobado_por] ?? null) : null,
    createdAt:         r.created_at,
  }));
}

export type InformeAjustesMes = {
  porMotivo:  { motivo: string; cantidad: number; total: number }[];
  porPersona: { nombre: string; cantidad: number; total: number }[];
};

// anioMes: "YYYY-MM". Solo cuenta los aprobados: son los que realmente movieron la deuda.
export async function informeAjustesMes(anioMes: string): Promise<InformeAjustesMes> {
  await requireAdmin();
  const db = createAdminClient() as any;

  const [y, m] = anioMes.split("-").map(Number);
  const desde = `${anioMes}-01`;
  const hasta = new Date(y, m, 1).toISOString().slice(0, 10);

  const { data, error } = await db
    .from("ajustes_internos")
    .select("motivo, monto, creado_por")
    .eq("estado", "aprobado")
    .gte("created_at", desde)
    .lt("created_at", hasta);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  const porMotivoMap  = new Map<string, { cantidad: number; total: number }>();
  const porPersonaMap = new Map<string, { cantidad: number; total: number }>();
  for (const r of rows) {
    const m0 = porMotivoMap.get(r.motivo) ?? { cantidad: 0, total: 0 };
    m0.cantidad += 1; m0.total += Number(r.monto);
    porMotivoMap.set(r.motivo, m0);

    const p0 = porPersonaMap.get(r.creado_por) ?? { cantidad: 0, total: 0 };
    p0.cantidad += 1; p0.total += Number(r.monto);
    porPersonaMap.set(r.creado_por, p0);
  }

  const personas = await nombresPorId(db, Array.from(porPersonaMap.keys()));

  return {
    porMotivo: Array.from(porMotivoMap.entries())
      .map(([motivo, v]) => ({ motivo, ...v }))
      .sort((a, b) => b.total - a.total),
    porPersona: Array.from(porPersonaMap.entries())
      .map(([id, v]) => ({ nombre: personas[id] ?? id, ...v }))
      .sort((a, b) => b.total - a.total),
  };
}
