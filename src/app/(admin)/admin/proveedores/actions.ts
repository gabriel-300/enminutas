"use server";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { esCategoriaGasto, imputarPago, normalizarCuit } from "@/lib/proveedores";
import { resolverProveedor } from "@/lib/proveedores-db";

type Result = { ok: true; id?: string } | { error: string };

function revalidar(proveedorId?: string) {
  revalidatePath("/admin/proveedores");
  if (proveedorId) revalidatePath(`/admin/proveedores/${proveedorId}`);
  revalidatePath("/admin/cocina/recepciones");
}

export type ProveedorInput = {
  nombre:              string;
  cuit?:               string | null;
  condicion_pago_dias: number;
  contacto?:           string | null;
  telefono?:           string | null;
  email?:              string | null;
  notas?:              string | null;
};

function limpiar(input: ProveedorInput) {
  const dias = Math.round(Number(input.condicion_pago_dias));
  return {
    nombre:              input.nombre.trim(),
    cuit:                normalizarCuit(input.cuit),
    condicion_pago_dias: Number.isFinite(dias) && dias >= 0 ? dias : 0,
    contacto:            input.contacto?.trim() || null,
    telefono:            input.telefono?.trim() || null,
    email:               input.email?.trim() || null,
    notas:               input.notas?.trim() || null,
  };
}

function mensajeDuplicado(msg: string): string {
  if (msg.includes("proveedores_cuit_uq"))   return "Ya existe un proveedor con ese CUIT";
  if (msg.includes("proveedores_nombre_uq")) return "Ya existe un proveedor con ese nombre";
  return msg;
}

export async function crearProveedor(input: ProveedorInput): Promise<Result> {
  try {
    await requireAdmin();
    if (!input.nombre?.trim()) return { error: "El nombre es obligatorio" };
    const db = createAdminClient() as any;
    const { data, error } = await db.from("proveedores").insert(limpiar(input)).select("id").single();
    if (error) return { error: mensajeDuplicado(error.message) };
    revalidar();
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function actualizarProveedor(id: string, input: ProveedorInput): Promise<Result> {
  try {
    await requireAdmin();
    if (!input.nombre?.trim()) return { error: "El nombre es obligatorio" };
    const db = createAdminClient() as any;
    const datos = limpiar(input);
    const { error } = await db.from("proveedores").update(datos).eq("id", id);
    if (error) return { error: mensajeDuplicado(error.message) };
    // El nombre se copia en recepciones para el historial; se mantiene en sincronía.
    await db.from("recepciones").update({ proveedor: datos.nombre, proveedor_cuit: datos.cuit }).eq("proveedor_id", id);
    revalidar(id);
    return { ok: true, id };
  } catch (e: any) {
    return { error: e.message };
  }
}

export type PagoProveedorInput = {
  proveedorId:  string;
  monto:        number;
  fecha:        string;        // YYYY-MM-DD
  metodo:       string;
  referencia?:  string | null;
  notas?:       string | null;
  recepcionIds: string[];      // facturas/remitos a cancelar; vacío = todo a cuenta
};

// Reparte el monto entre los comprobantes elegidos (por vencimiento) y deja el sobrante a cuenta.
// Los saldos se recalculan acá, no se confían al cliente.
export async function registrarPagoProveedor(
  input: PagoProveedorInput,
): Promise<{ error: string } | { ok: true; grupoId: string; aCuenta: number }> {
  try {
    const user = await requireAdmin();
    const monto = Math.round(Number(input.monto) * 100) / 100;
    if (!Number.isFinite(monto) || monto <= 0) return { error: "El monto debe ser mayor a cero" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { error: "Fecha inválida" };

    const db = createAdminClient() as any;

    let pendientes: { id: string; saldo: number }[] = [];
    if (input.recepcionIds.length > 0) {
      const { data: recs, error } = await db
        .from("recepciones")
        .select("id, total, fecha, fecha_vencimiento_pago, genera_deuda, proveedor_id")
        .in("id", input.recepcionIds);
      if (error) return { error: error.message };

      const validas = (recs ?? []).filter((r: any) => r.proveedor_id === input.proveedorId && r.genera_deuda);
      if (validas.length !== input.recepcionIds.length)
        return { error: "Alguno de los comprobantes no pertenece al proveedor o no genera deuda" };

      const { data: pagos } = await db
        .from("pagos_proveedores").select("recepcion_id, monto").in("recepcion_id", input.recepcionIds);
      const pagado: Record<string, number> = {};
      for (const p of pagos ?? []) pagado[p.recepcion_id] = (pagado[p.recepcion_id] ?? 0) + Number(p.monto);

      pendientes = validas
        .sort((a: any, b: any) =>
          String(a.fecha_vencimiento_pago ?? a.fecha).localeCompare(String(b.fecha_vencimiento_pago ?? b.fecha)))
        .map((r: any) => ({ id: r.id, saldo: Number(r.total ?? 0) - (pagado[r.id] ?? 0) }));
    }

    const { imputaciones, aCuenta } = imputarPago(monto, pendientes);
    const grupoId = randomUUID();
    const base = {
      proveedor_id: input.proveedorId,
      fecha:        input.fecha,
      metodo:       input.metodo || "transferencia",
      referencia:   input.referencia?.trim() || null,
      notas:        input.notas?.trim() || null,
      grupo_id:     grupoId,
      created_by:   user.id,
    };
    const filas = imputaciones.map(i => ({ ...base, recepcion_id: i.recepcionId, monto: i.monto }));
    if (aCuenta > 0) filas.push({ ...base, recepcion_id: null as any, monto: aCuenta });

    const { error: errIns } = await db.from("pagos_proveedores").insert(filas);
    if (errIns) return { error: errIns.message };

    revalidar(input.proveedorId);
    return { ok: true, grupoId, aCuenta };
  } catch (e: any) {
    return { error: e.message };
  }
}

// Elimina todo el pago (un pago repartido entre varias facturas se borra completo).
export async function eliminarPagoProveedor(grupoId: string, proveedorId: string): Promise<Result> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { error } = await db.from("pagos_proveedores").delete().eq("grupo_id", grupoId).eq("proveedor_id", proveedorId);
    if (error) return { error: error.message };
    revalidar(proveedorId);
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// Un remito que después se factura (o cualquier compra ya pagada fuera del sistema) no debe duplicar deuda.
export async function setGeneraDeuda(recepcionId: string, generaDeuda: boolean, proveedorId: string): Promise<Result> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    if (!generaDeuda) {
      const { count } = await db
        .from("pagos_proveedores").select("id", { count: "exact", head: true }).eq("recepcion_id", recepcionId);
      if ((count ?? 0) > 0) return { error: "Tiene pagos imputados: eliminalos antes de sacarla de la deuda" };
    }
    const { error } = await db.from("recepciones").update({ genera_deuda: generaDeuda }).eq("id", recepcionId);
    if (error) return { error: error.message };
    revalidar(proveedorId);
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function setVencimientoPago(recepcionId: string, fecha: string | null, proveedorId: string): Promise<Result> {
  try {
    await requireAdmin();
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida" };
    const db = createAdminClient() as any;
    const { error } = await db.from("recepciones").update({ fecha_vencimiento_pago: fecha || null }).eq("id", recepcionId);
    if (error) return { error: error.message };
    revalidar(proveedorId);
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export type GastoInput = {
  proveedor:       string;
  cuit?:           string | null;
  categoria:       string;
  numero:          string;
  fecha:           string;        // YYYY-MM-DD
  vencimientoPago: string;        // YYYY-MM-DD
  total:           number;
  notas?:          string | null;
  // Si viene, el gasto se paga en el acto (contado) y no queda deuda.
  pagoContado?:    { metodo: string; referencia?: string | null };
};

// Gasto sin mercadería (luz, alquiler…): genera deuda con el proveedor, no toca stock.
export async function registrarGasto(input: GastoInput): Promise<{ error: string } | { ok: true; proveedorId: string; grupoId: string | null }> {
  try {
    const user = await requireAdmin();
    const total = Math.round(Number(input.total) * 100) / 100;
    if (!input.proveedor?.trim()) return { error: "El proveedor es obligatorio" };
    if (!input.numero?.trim())    return { error: "El número de comprobante es obligatorio" };
    if (!esCategoriaGasto(input.categoria)) return { error: "Elegí una categoría" };
    if (!Number.isFinite(total) || total <= 0) return { error: "El importe debe ser mayor a cero" };
    if (!/^d{4}-d{2}-d{2}$/.test(input.fecha) || !/^d{4}-d{2}-d{2}$/.test(input.vencimientoPago))
      return { error: "Fecha inválida" };

    const db = createAdminClient() as any;
    const prov = await resolverProveedor(db, input.proveedor, input.cuit ?? null);
    if ("error" in prov) return { error: prov.error };

    const { data: gasto, error } = await db.from("recepciones").insert({
      tipo:                   "gasto",
      categoria_gasto:        input.categoria,
      numero:                 input.numero.trim(),
      proveedor:              prov.nombre,
      proveedor_id:           prov.id,
      proveedor_cuit:         normalizarCuit(input.cuit) ?? prov.cuit,
      fecha:                  input.fecha,
      fecha_vencimiento_pago: input.vencimientoPago,
      total,
      notas:                  input.notas?.trim() || null,
      genera_deuda:           true,
      created_by:             user.id,
    }).select("id").single();
    if (error) return { error: error.message };

    // Contado: se registra el pago por el total, así no queda deuda y hay orden de pago.
    let grupoId: string | null = null;
    if (input.pagoContado) {
      grupoId = randomUUID();
      const { error: errPago } = await db.from("pagos_proveedores").insert({
        proveedor_id: prov.id,
        recepcion_id: gasto.id,
        monto:        total,
        fecha:        input.fecha,
        metodo:       input.pagoContado.metodo || "efectivo",
        referencia:   input.pagoContado.referencia?.trim() || null,
        notas:        "Pagado al contado",
        grupo_id:     grupoId,
        created_by:   user.id,
      });
      if (errPago) {
        await db.from("recepciones").delete().eq("id", gasto.id); // sin pago no se deja el gasto a medias
        return { error: errPago.message };
      }
    }

    revalidar(prov.id);
    return { ok: true, proveedorId: prov.id, grupoId };
  } catch (e: any) {
    return { error: e.message };
  }
}
