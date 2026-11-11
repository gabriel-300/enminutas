"use server";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { esCategoriaGasto, fechaValida, imputarPago, normalizarCuit } from "@/lib/proveedores";
import { esCondicionIva, normalizarCbu, validarDesglose } from "@/lib/proveedores-ficha";
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
  condicion_iva?:      string | null;
  cbu?:                string | null;
  alias_bancario?:     string | null;
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
    condicion_iva:       input.condicion_iva || null,
    cbu:                 normalizarCbu(input.cbu) as string | null,
    alias_bancario:      input.alias_bancario?.trim() || null,
  };
}

// Valida los datos de la ficha que limpiar() no puede corregir solo.
function errorDeFicha(input: ProveedorInput): string | null {
  if (!input.nombre?.trim()) return "El nombre es obligatorio";
  if (input.condicion_iva && !esCondicionIva(input.condicion_iva)) return "Condición de IVA inválida";
  if (normalizarCbu(input.cbu) === "invalido") return "El CBU debe tener 22 dígitos";
  return null;
}

function mensajeDuplicado(msg: string): string {
  if (msg.includes("proveedores_cuit_uq"))   return "Ya existe un proveedor con ese CUIT";
  if (msg.includes("proveedores_nombre_uq")) return "Ya existe un proveedor con ese nombre";
  return msg;
}

export async function crearProveedor(input: ProveedorInput): Promise<Result> {
  try {
    await requireAdmin();
    const invalido = errorDeFicha(input);
    if (invalido) return { error: invalido };
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
    const invalido = errorDeFicha(input);
    if (invalido) return { error: invalido };
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
// Los saldos se recalculan acá, contra la base, no se confían al cliente.
async function repartirPago(
  db: any, proveedorId: string, monto: number, recepcionIds: string[],
): Promise<{ error: string } | { imputaciones: { recepcionId: string; monto: number }[]; aCuenta: number }> {
  let pendientes: { id: string; saldo: number }[] = [];
  if (recepcionIds.length > 0) {
    const { data: recs, error } = await db
      .from("recepciones")
      .select("id, total, fecha, fecha_vencimiento_pago, genera_deuda, proveedor_id")
      .in("id", recepcionIds);
    if (error) return { error: error.message };

    const validas = (recs ?? []).filter((r: any) => r.proveedor_id === proveedorId && r.genera_deuda);
    if (validas.length !== recepcionIds.length)
      return { error: "Alguno de los comprobantes no pertenece al proveedor o no genera deuda" };

    const { data: pagos } = await db
      .from("pagos_proveedores").select("recepcion_id, monto").in("recepcion_id", recepcionIds);
    const pagado: Record<string, number> = {};
    for (const p of pagos ?? []) pagado[p.recepcion_id] = (pagado[p.recepcion_id] ?? 0) + Number(p.monto);

    pendientes = validas
      .sort((a: any, b: any) =>
        String(a.fecha_vencimiento_pago ?? a.fecha).localeCompare(String(b.fecha_vencimiento_pago ?? b.fecha)))
      .map((r: any) => ({ id: r.id, saldo: Number(r.total ?? 0) - (pagado[r.id] ?? 0) }));
  }
  return imputarPago(monto, pendientes);
}

// ── Orden de pago: borrador → aprobada (Alex) → pagada ───────────────────────────────────────────────
// Solo al pasar a "pagada" se insertan las filas de pagos_proveedores, que son las que bajan la deuda.

// Quién puede aprobar: si APROBADORES_PAGOS (emails separados por coma) está definida, solo esos
// administradores; si no, cualquier administrador.
function puedeAprobar(email: string | undefined): boolean {
  const lista = (process.env.APROBADORES_PAGOS ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (lista.length === 0) return true;
  return !!email && lista.includes(email.toLowerCase());
}

export async function crearOrdenPago(
  input: PagoProveedorInput,
): Promise<{ error: string } | { ok: true; ordenId: string; aCuenta: number }> {
  try {
    const user = await requireAdmin();
    const monto = Math.round(Number(input.monto) * 100) / 100;
    if (!Number.isFinite(monto) || monto <= 0) return { error: "El monto debe ser mayor a cero" };
    if (!fechaValida(input.fecha)) return { error: "Fecha inválida" };

    const db = createAdminClient() as any;
    const reparto = await repartirPago(db, input.proveedorId, monto, input.recepcionIds);
    if ("error" in reparto) return { error: reparto.error };

    const { data, error } = await db.from("ordenes_pago").insert({
      proveedor_id:  input.proveedorId,
      monto,
      fecha:         input.fecha,
      metodo:        input.metodo || "transferencia",
      referencia:    input.referencia?.trim() || null,
      notas:         input.notas?.trim() || null,
      recepcion_ids: input.recepcionIds,
      estado:        "borrador",
      creado_por:    user.id,
    }).select("id").single();
    if (error) return { error: error.message };

    revalidar(input.proveedorId);
    return { ok: true, ordenId: data.id, aCuenta: reparto.aCuenta };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function aprobarOrdenPago(ordenId: string, proveedorId: string): Promise<Result> {
  try {
    const user = await requireAdmin();
    if (!puedeAprobar(user.email))
      return { error: "Tu usuario no está autorizado a aprobar órdenes de pago" };
    const db = createAdminClient() as any;
    // Separación de funciones: sin lista de aprobadores configurada, quien crea la orden no la aprueba.
    if (!process.env.APROBADORES_PAGOS?.trim()) {
      const { data: o } = await db.from("ordenes_pago").select("creado_por").eq("id", ordenId).single();
      if (o?.creado_por === user.id) return { error: "No podés aprobar una orden que creaste vos" };
    }
    const { data, error } = await db.from("ordenes_pago")
      .update({ estado: "aprobada", aprobado_por: user.id, aprobado_at: new Date().toISOString() })
      .eq("id", ordenId).eq("proveedor_id", proveedorId).eq("estado", "borrador")
      .select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "La orden no está en borrador" };
    revalidar(proveedorId);
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// Registra el pago real de una orden aprobada. Los saldos se vuelven a calcular al momento de pagar.
export async function pagarOrdenPago(
  ordenId: string, proveedorId: string,
): Promise<{ error: string } | { ok: true; grupoId: string; aCuenta: number }> {
  try {
    const user = await requireAdmin();
    const db = createAdminClient() as any;

    // Se "reclama" la orden de forma atómica: dos clics no pagan dos veces.
    const { data: reclamada, error: errReclamo } = await db.from("ordenes_pago")
      .update({ estado: "pagada", pagado_por: user.id, pagado_at: new Date().toISOString() })
      .eq("id", ordenId).eq("proveedor_id", proveedorId).eq("estado", "aprobada")
      .select("*");
    if (errReclamo) return { error: errReclamo.message };
    const orden = reclamada?.[0];
    if (!orden) return { error: "La orden tiene que estar aprobada para poder pagarse" };

    const volverAAprobada = () => db.from("ordenes_pago")
      .update({ estado: "aprobada", pagado_por: null, pagado_at: null }).eq("id", ordenId);

    const reparto = await repartirPago(db, proveedorId, Number(orden.monto), orden.recepcion_ids ?? []);
    if ("error" in reparto) { await volverAAprobada(); return { error: reparto.error }; }

    const base = {
      proveedor_id: proveedorId,
      fecha:        orden.fecha,
      metodo:       orden.metodo,
      referencia:   orden.referencia,
      notas:        orden.notas,
      grupo_id:     orden.id,
      created_by:   user.id,
    };
    const filas = reparto.imputaciones.map(i => ({ ...base, recepcion_id: i.recepcionId, monto: i.monto }));
    if (reparto.aCuenta > 0) filas.push({ ...base, recepcion_id: null as any, monto: reparto.aCuenta });

    const { error: errIns } = await db.from("pagos_proveedores").insert(filas);
    if (errIns) { await volverAAprobada(); return { error: errIns.message }; }

    revalidar(proveedorId);
    return { ok: true, grupoId: orden.id, aCuenta: reparto.aCuenta };
  } catch (e: any) {
    return { error: e.message };
  }
}

// Una orden todavía no pagada se puede descartar. Una pagada se corrige eliminando el pago.
export async function anularOrdenPago(ordenId: string, proveedorId: string): Promise<Result> {
  try {
    await requireAdmin();
    const db = createAdminClient() as any;
    const { data: orden } = await db.from("ordenes_pago")
      .select("estado").eq("id", ordenId).eq("proveedor_id", proveedorId).maybeSingle();
    if (!orden) return { error: "Orden no encontrada" };
    if (orden.estado === "pagada") return { error: "La orden ya está pagada: eliminá el pago para deshacerla" };
    const { error } = await db.from("ordenes_pago").delete().eq("id", ordenId).eq("proveedor_id", proveedorId);
    if (error) return { error: error.message };
    revalidar(proveedorId);
    return { ok: true };
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
    // La orden de pago que originó este pago (si existe) se descarta junto con él.
    await db.from("ordenes_pago").delete().eq("id", grupoId).eq("proveedor_id", proveedorId);
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
    if (fecha && !fechaValida(fecha)) return { error: "Fecha inválida" };
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
  // Desglose opcional: si se informa, neto + IVA + percepciones tienen que sumar el total.
  neto?:           number | null;
  iva?:            number | null;
  percepciones?:   number | null;
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
    if (!fechaValida(input.fecha) || !fechaValida(input.vencimientoPago))
      return { error: "Fecha inválida" };
    const errDesglose = validarDesglose(input, total);
    if (errDesglose) return { error: errDesglose };

    const db = createAdminClient() as any;
    const prov = await resolverProveedor(db, input.proveedor, input.cuit ?? null);
    if ("error" in prov) return { error: prov.error };

    const { count: repetidos } = await db.from("recepciones").select("id", { count: "exact", head: true })
      .eq("proveedor_id", prov.id).eq("tipo", "gasto").eq("numero", input.numero.trim());
    if ((repetidos ?? 0) > 0) return { error: `Ya hay un gasto N° ${input.numero.trim()} de ${prov.nombre}` };

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
      neto:                   input.neto ?? null,
      iva:                    input.iva ?? null,
      percepciones:           input.percepciones ?? null,
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
