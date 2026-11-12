import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "@/test/fake-db";

const state = vi.hoisted(() => ({ db: null as any, admin: true }));

vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => state.db }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => {
    if (!state.admin) throw new Error("No autorizado");
    return { id: "admin-1" };
  },
  requireRole: async () => ({ id: "admin-1" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  actualizarProveedor, anularOrdenPago, aprobarOrdenPago, crearOrdenPago, crearProveedor,
  desvincularRemito, eliminarPagoProveedor, pagarOrdenPago, registrarGasto, setGeneraDeuda, setVencimientoPago,
  vincularRemitos,
} from "./actions";

// Camino completo de un pago: crear la orden, aprobarla y registrar el pago.
async function registrarPagoProveedor(input: Parameters<typeof crearOrdenPago>[0]) {
  const orden = await crearOrdenPago(input);
  if ("error" in orden) return orden;
  const aprobada = await aprobarOrdenPago(orden.ordenId, input.proveedorId);
  if ("error" in aprobada) return aprobada;
  return pagarOrdenPago(orden.ordenId, input.proveedorId);
}

let db: FakeDb;
beforeEach(() => {
  db = new FakeDb();
  db.unique = { proveedores: [["nombre"], ["cuit"]] };
  state.db = db;
  state.admin = true;
});

const hoy = "2026-11-02";
const err = (r: any) => ("error" in r ? r.error : null);

describe("permisos: todas las actions exigen admin", () => {
  it("rechazan a un usuario sin rol admin", async () => {
    state.admin = false;
    const rs = await Promise.all([
      crearProveedor({ nombre: "X", condicion_pago_dias: 0 }),
      actualizarProveedor("id", { nombre: "X", condicion_pago_dias: 0 }),
      registrarPagoProveedor({ proveedorId: "p", monto: 10, fecha: hoy, metodo: "efectivo", recepcionIds: [] }),
      eliminarPagoProveedor("g", "p"),
      setGeneraDeuda("r", false, "p"),
      setVencimientoPago("r", hoy, "p"),
      vincularRemitos("f", ["r"], "p"),
      desvincularRemito("r", "p"),
      registrarGasto({ proveedor: "X", categoria: "luz", numero: "1", fecha: hoy, vencimientoPago: hoy, total: 10 }),
    ]);
    for (const r of rs) expect(err(r)).toBe("No autorizado");
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
    expect(db.rows("proveedores")).toHaveLength(0);
  });
});

describe("crearProveedor / actualizarProveedor", () => {
  it("exige nombre y normaliza CUIT y plazo", async () => {
    expect(err(await crearProveedor({ nombre: "  ", condicion_pago_dias: 0 }))).toMatch(/nombre/i);
    const r = await crearProveedor({ nombre: " Molino ", cuit: "30555181619", condicion_pago_dias: -5 });
    expect("ok" in r).toBe(true);
    expect(db.rows("proveedores")[0]).toMatchObject({ nombre: "Molino", cuit: "30-55518161-9", condicion_pago_dias: 0 });
  });

  it("traduce nombre o CUIT duplicado a un mensaje claro", async () => {
    await crearProveedor({ nombre: "Molino", cuit: "30-55518161-9", condicion_pago_dias: 0 });
    expect(err(await crearProveedor({ nombre: "MOLINO", condicion_pago_dias: 0 }))).toMatch(/mismo nombre|ese nombre/i);
    expect(err(await crearProveedor({ nombre: "Otro", cuit: "30555181619", condicion_pago_dias: 0 }))).toMatch(/CUIT/i);
  });

  it("al editar sincroniza el nombre en las recepciones del proveedor", async () => {
    const [p] = db.seed("proveedores", [{ nombre: "Viejo", cuit: null }]);
    db.seed("recepciones", [{ proveedor_id: p.id, proveedor: "Viejo" }, { proveedor_id: "otro", proveedor: "Otro" }]);
    await actualizarProveedor(p.id, { nombre: "Nuevo", cuit: "20-12345678-6", condicion_pago_dias: 15 });
    expect(db.rows("recepciones").map(r => r.proveedor)).toEqual(["Nuevo", "Otro"]);
  });
});

describe("registrarPagoProveedor", () => {
  function escenario() {
    const [p] = db.seed("proveedores", [{ nombre: "A" }]);
    const [q] = db.seed("proveedores", [{ nombre: "B" }]);
    const [r1, r2, r3, rOtro, rSinDeuda] = db.seed("recepciones", [
      { proveedor_id: p.id, total: 1000, fecha: "2026-10-01", fecha_vencimiento_pago: "2026-10-31", genera_deuda: true },
      { proveedor_id: p.id, total: 500,  fecha: "2026-10-05", fecha_vencimiento_pago: "2026-10-10", genera_deuda: true },
      { proveedor_id: p.id, total: 300,  fecha: "2026-10-20", fecha_vencimiento_pago: "2026-11-20", genera_deuda: true },
      { proveedor_id: q.id, total: 999,  fecha: "2026-10-01", genera_deuda: true },
      { proveedor_id: p.id, total: 700,  fecha: "2026-10-01", genera_deuda: false },
    ]);
    return { p, q, r1, r2, r3, rOtro, rSinDeuda };
  }
  const base = { fecha: hoy, metodo: "transferencia" };

  it("valida monto y fecha", async () => {
    const { p } = escenario();
    for (const monto of [0, -5, NaN, Infinity]) {
      expect(err(await registrarPagoProveedor({ ...base, proveedorId: p.id, monto, recepcionIds: [] }))).toMatch(/monto/i);
    }
    expect(err(await registrarPagoProveedor({ ...base, fecha: "2026-13-45", proveedorId: p.id, monto: 10, recepcionIds: [] }))).toMatch(/fecha/i);
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
  });

  it("reparte por vencimiento (no por el orden en que se tildó) y deja el sobrante a cuenta", async () => {
    const { p, r1, r2, r3 } = escenario();
    const res = await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 1700, recepcionIds: [r3.id, r1.id, r2.id] });
    expect("ok" in res && res.aCuenta).toBe(0);
    const pagos = db.rows("pagos_proveedores");
    expect(pagos.map(x => [x.recepcion_id, x.monto])).toEqual([[r2.id, 500], [r1.id, 1000], [r3.id, 200]]);
    expect(new Set(pagos.map(x => x.grupo_id)).size).toBe(1);
    expect(pagos.reduce((s, x) => s + x.monto, 0)).toBe(1700);
  });

  it("el sobrante queda a cuenta con el mismo grupo", async () => {
    const { p, r2 } = escenario();
    const res = await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 800, recepcionIds: [r2.id] });
    expect("ok" in res && res.aCuenta).toBe(300);
    const pagos = db.rows("pagos_proveedores");
    expect(pagos).toHaveLength(2);
    expect(pagos[1]).toMatchObject({ recepcion_id: null, monto: 300 });
    expect(pagos[0].grupo_id).toBe(pagos[1].grupo_id);
  });

  it("descuenta lo ya pagado de cada comprobante", async () => {
    const { p, r1 } = escenario();
    db.seed("pagos_proveedores", [{ proveedor_id: p.id, recepcion_id: r1.id, monto: 900 }]);
    await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 500, recepcionIds: [r1.id] });
    const nuevos = db.rows("pagos_proveedores").slice(1);
    expect(nuevos.map(x => [x.recepcion_id, x.monto])).toEqual([[r1.id, 100], [null, 400]]);
  });

  it("sin comprobantes tildados todo va a cuenta", async () => {
    const { p } = escenario();
    await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 250, recepcionIds: [] });
    expect(db.rows("pagos_proveedores")).toMatchObject([{ recepcion_id: null, monto: 250 }]);
  });

  it("rechaza comprobantes de otro proveedor o que no generan deuda", async () => {
    const { p, rOtro, rSinDeuda, r1 } = escenario();
    expect(err(await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 10, recepcionIds: [rOtro.id] }))).toMatch(/no pertenece/i);
    expect(err(await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 10, recepcionIds: [rSinDeuda.id] }))).toMatch(/no pertenece|no genera/i);
    expect(err(await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 10, recepcionIds: [r1.id, "inexistente"] }))).toBeTruthy();
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
  });

  it("no pierde centavos con montos decimales", async () => {
    const { p, r2 } = escenario();
    await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 100.1 + 0.2, recepcionIds: [r2.id] });
    expect(db.rows("pagos_proveedores")[0].monto).toBe(100.3);
  });
});

describe("orden de pago: borrador → aprobada → pagada", () => {
  function conFactura() {
    const [p] = db.seed("proveedores", [{ nombre: "A" }]);
    const [r] = db.seed("recepciones", [{ proveedor_id: p.id, total: 1000, fecha: "2026-10-01", genera_deuda: true }]);
    return { p, r };
  }
  const base = { fecha: hoy, metodo: "transferencia" };

  it("un borrador no baja la deuda: no crea pagos", async () => {
    const { p, r } = conFactura();
    const o = await crearOrdenPago({ ...base, proveedorId: p.id, monto: 1000, recepcionIds: [r.id] });
    expect("ok" in o).toBe(true);
    expect(db.rows("ordenes_pago")).toMatchObject([{ estado: "borrador", monto: 1000 }]);
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
  });

  it("no se puede pagar una orden que no fue aprobada", async () => {
    const { p, r } = conFactura();
    const o = await crearOrdenPago({ ...base, proveedorId: p.id, monto: 1000, recepcionIds: [r.id] });
    if (!("ok" in o)) throw new Error("no se creó");
    expect(err(await pagarOrdenPago(o.ordenId, p.id))).toMatch(/aprobada/i);
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
  });

  it("aprobada se puede pagar: inserta los pagos con grupo_id = id de la orden", async () => {
    const { p, r } = conFactura();
    const o = await crearOrdenPago({ ...base, proveedorId: p.id, monto: 1000, recepcionIds: [r.id] });
    if (!("ok" in o)) throw new Error("no se creó");
    await aprobarOrdenPago(o.ordenId, p.id);
    expect(db.rows("ordenes_pago")[0]).toMatchObject({ estado: "aprobada", aprobado_por: "admin-1" });
    const res = await pagarOrdenPago(o.ordenId, p.id);
    expect("ok" in res).toBe(true);
    expect(db.rows("ordenes_pago")[0].estado).toBe("pagada");
    expect(db.rows("pagos_proveedores")).toMatchObject([{ recepcion_id: r.id, monto: 1000, grupo_id: o.ordenId }]);
  });

  it("no se paga dos veces la misma orden", async () => {
    const { p, r } = conFactura();
    const o = await crearOrdenPago({ ...base, proveedorId: p.id, monto: 1000, recepcionIds: [r.id] });
    if (!("ok" in o)) throw new Error("no se creó");
    await aprobarOrdenPago(o.ordenId, p.id);
    await pagarOrdenPago(o.ordenId, p.id);
    expect(err(await pagarOrdenPago(o.ordenId, p.id))).toBeTruthy();
    expect(db.rows("pagos_proveedores")).toHaveLength(1);
  });

  it("solo aprueban los emails de APROBADORES_PAGOS cuando está definida", async () => {
    const { p, r } = conFactura();
    const o = await crearOrdenPago({ ...base, proveedorId: p.id, monto: 1000, recepcionIds: [r.id] });
    if (!("ok" in o)) throw new Error("no se creó");
    process.env.APROBADORES_PAGOS = "alex@empresa.com";
    try {
      expect(err(await aprobarOrdenPago(o.ordenId, p.id))).toMatch(/no está autorizado/i);
      expect(db.rows("ordenes_pago")[0].estado).toBe("borrador");
    } finally {
      delete process.env.APROBADORES_PAGOS;
    }
  });

  it("una orden pendiente se puede descartar, una pagada no", async () => {
    const { p, r } = conFactura();
    const o = await crearOrdenPago({ ...base, proveedorId: p.id, monto: 400, recepcionIds: [r.id] });
    if (!("ok" in o)) throw new Error("no se creó");
    expect("ok" in (await anularOrdenPago(o.ordenId, p.id))).toBe(true);
    expect(db.rows("ordenes_pago")).toHaveLength(0);

    const o2 = await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 400, recepcionIds: [r.id] });
    if (!("ok" in o2)) throw new Error("no se pagó");
    expect(err(await anularOrdenPago(o2.grupoId, p.id))).toMatch(/ya está pagada/i);
  });

  it("al eliminar el pago se descarta también su orden", async () => {
    const { p, r } = conFactura();
    const pago = await registrarPagoProveedor({ ...base, proveedorId: p.id, monto: 1000, recepcionIds: [r.id] });
    if (!("ok" in pago)) throw new Error("no se pagó");
    await eliminarPagoProveedor(pago.grupoId, p.id);
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
    expect(db.rows("ordenes_pago")).toHaveLength(0);
  });
});

describe("ficha del proveedor y desglose", () => {
  it("guarda condición de IVA, CBU y alias; rechaza CBU o condición inválidos", async () => {
    const ok = await crearProveedor({
      nombre: "Molino", condicion_pago_dias: 0, condicion_iva: "responsable_inscripto",
      cbu: "0170 0990 4000 0000 1234 56", alias_bancario: " molino.pagos ",
    });
    expect("ok" in ok).toBe(true);
    expect(db.rows("proveedores")[0]).toMatchObject({
      condicion_iva: "responsable_inscripto", cbu: "0170099040000000123456", alias_bancario: "molino.pagos",
    });
    expect(err(await crearProveedor({ nombre: "X", condicion_pago_dias: 0, cbu: "123" }))).toMatch(/CBU/);
    expect(err(await crearProveedor({ nombre: "Y", condicion_pago_dias: 0, condicion_iva: "otra" }))).toMatch(/IVA/);
  });

  it("un gasto con desglose que no suma el total se rechaza", async () => {
    const gasto = { proveedor: "Energía", categoria: "luz", numero: "1", fecha: hoy, vencimientoPago: hoy, total: 1210 };
    expect(err(await registrarGasto({ ...gasto, neto: 1000, iva: 100 }))).toMatch(/no suman/);
    expect(db.rows("recepciones")).toHaveLength(0);
    await registrarGasto({ ...gasto, neto: 1000, iva: 210 });
    expect(db.rows("recepciones")[0]).toMatchObject({ neto: 1000, iva: 210 });
  });
});

describe("eliminarPagoProveedor / setGeneraDeuda / setVencimientoPago", () => {
  it("elimina solo el grupo del proveedor indicado", async () => {
    const [p, q] = db.seed("proveedores", [{ nombre: "A" }, { nombre: "B" }]);
    db.seed("pagos_proveedores", [
      { proveedor_id: p.id, grupo_id: "g1", monto: 1 }, { proveedor_id: p.id, grupo_id: "g1", monto: 2 },
      { proveedor_id: p.id, grupo_id: "g2", monto: 3 }, { proveedor_id: q.id, grupo_id: "g1", monto: 4 },
    ]);
    await eliminarPagoProveedor("g1", p.id);
    expect(db.rows("pagos_proveedores").map(x => x.monto)).toEqual([3, 4]);
  });

  it("no deja sacar de la deuda un comprobante con pagos, pero sí volver a ponerlo", async () => {
    const [r] = db.seed("recepciones", [{ genera_deuda: true }]);
    db.seed("pagos_proveedores", [{ recepcion_id: r.id, monto: 5 }]);
    expect(err(await setGeneraDeuda(r.id, false, "p"))).toMatch(/pagos imputados/i);
    expect(r.genera_deuda).toBe(true);
    db.tables.pagos_proveedores = [];
    await setGeneraDeuda(r.id, false, "p");
    expect(r.genera_deuda).toBe(false);
    await setGeneraDeuda(r.id, true, "p");
    expect(r.genera_deuda).toBe(true);
  });

  it("valida la fecha de vencimiento y permite limpiarla", async () => {
    const [r] = db.seed("recepciones", [{ fecha_vencimiento_pago: "2026-10-01" }]);
    expect(err(await setVencimientoPago(r.id, "2026-02-30", "p"))).toMatch(/fecha/i);
    expect(r.fecha_vencimiento_pago).toBe("2026-10-01");
    await setVencimientoPago(r.id, "2026-12-01", "p");
    expect(r.fecha_vencimiento_pago).toBe("2026-12-01");
    await setVencimientoPago(r.id, null, "p");
    expect(r.fecha_vencimiento_pago).toBeNull();
  });
});

describe("registrarGasto", () => {
  const gasto = { proveedor: "Energía", categoria: "luz", numero: "0001-123", fecha: hoy, vencimientoPago: "2026-11-20", total: 15000 };

  it("valida los campos", async () => {
    expect(err(await registrarGasto({ ...gasto, proveedor: " " }))).toMatch(/proveedor/i);
    expect(err(await registrarGasto({ ...gasto, numero: "" }))).toMatch(/comprobante/i);
    expect(err(await registrarGasto({ ...gasto, categoria: "combustible" }))).toMatch(/categor/i);
    expect(err(await registrarGasto({ ...gasto, total: 0 }))).toMatch(/importe/i);
    expect(err(await registrarGasto({ ...gasto, total: NaN }))).toMatch(/importe/i);
    expect(err(await registrarGasto({ ...gasto, fecha: "2026-13-01" }))).toMatch(/fecha/i);
    expect(err(await registrarGasto({ ...gasto, vencimientoPago: "mañana" }))).toMatch(/fecha/i);
    expect(db.rows("recepciones")).toHaveLength(0);
    expect(db.rows("proveedores")).toHaveLength(0);
  });

  it("a pagar: crea proveedor y gasto con deuda, sin pago", async () => {
    const r = await registrarGasto(gasto);
    expect("ok" in r && r.grupoId).toBeNull();
    expect(db.rows("proveedores")).toHaveLength(1);
    expect(db.rows("recepciones")[0]).toMatchObject({
      tipo: "gasto", categoria_gasto: "luz", total: 15000, genera_deuda: true, fecha_vencimiento_pago: "2026-11-20",
    });
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
  });

  it("reutiliza el proveedor aunque cambie mayúsculas o SRL", async () => {
    db.seed("proveedores", [{ nombre: "El Abasto", cuit: null }]);
    await registrarGasto({ ...gasto, proveedor: "el abasto S.R.L." });
    expect(db.rows("proveedores")).toHaveLength(1);
    expect(db.rows("recepciones")[0].proveedor).toBe("El Abasto");
  });

  it("rechaza un número de comprobante repetido del mismo proveedor", async () => {
    await registrarGasto(gasto);
    expect(err(await registrarGasto(gasto))).toMatch(/Ya hay un gasto/);
    expect(db.rows("recepciones")).toHaveLength(1);
    // otro proveedor puede repetir el número
    expect("ok" in (await registrarGasto({ ...gasto, proveedor: "Agua SA" }))).toBe(true);
  });

  it("contado: registra el pago por el total y no deja deuda", async () => {
    const r = await registrarGasto({ ...gasto, pagoContado: { metodo: "efectivo", referencia: "rec 55" } });
    expect("ok" in r && typeof r.grupoId).toBe("string");
    const [g] = db.rows("recepciones");
    expect(db.rows("pagos_proveedores")).toMatchObject([
      { recepcion_id: g.id, monto: 15000, fecha: hoy, metodo: "efectivo", referencia: "rec 55", notas: "Pagado al contado" },
    ]);
  });

  it("contado: si falla el pago, borra el gasto (no queda deuda fantasma)", async () => {
    db.failInsert.pagos_proveedores = "boom";
    const r = await registrarGasto({ ...gasto, pagoContado: { metodo: "efectivo" } });
    expect(err(r)).toBe("boom");
    expect(db.rows("recepciones")).toHaveLength(0);
    expect(db.rows("pagos_proveedores")).toHaveLength(0);
  });
});

describe("vincularRemitos / desvincularRemito", () => {
  function escenario() {
    const [p, q] = db.seed("proveedores", [{ nombre: "San Gabriel" }, { nombre: "Otro" }]);
    const [fac] = db.seed("recepciones", [{ tipo: "factura", proveedor_id: p.id, genera_deuda: true, neto: 300, total: 363 }]);
    const [r1, r2] = db.seed("recepciones", [
      { tipo: "remito", proveedor_id: p.id, genera_deuda: true, total: 100, factura_id: null },
      { tipo: "remito", proveedor_id: p.id, genera_deuda: true, total: 200, factura_id: null },
    ]);
    return { p, q, fac, r1, r2 };
  }

  it("vincula los remitos a la factura y los saca de la deuda", async () => {
    const { p, fac, r1, r2 } = escenario();
    const res: any = await vincularRemitos(fac.id, [r1.id, r2.id], p.id);
    expect(res.ok).toBe(true);
    expect(res.diferencia).toBe(0); // 100 + 200 = neto 300
    for (const r of [r1, r2]) expect(r).toMatchObject({ factura_id: fac.id, genera_deuda: false });
    expect(fac.genera_deuda).toBe(true); // la deuda queda en la factura
  });

  it("informa la diferencia cuando los remitos no suman el neto de la factura", async () => {
    const { p, fac, r1 } = escenario();
    const res: any = await vincularRemitos(fac.id, [r1.id], p.id);
    expect(res.diferencia).toBe(200);
  });

  it("no vincula si la factura no genera deuda (desaparecería la deuda de los dos)", async () => {
    const { p, fac, r1 } = escenario();
    fac.genera_deuda = false;
    expect(err(await vincularRemitos(fac.id, [r1.id], p.id))).toMatch(/no genera deuda/i);
    expect(r1.genera_deuda).toBe(true);
  });

  it("rechaza remitos de otro proveedor, ya vinculados o con pagos imputados", async () => {
    const { p, q, fac, r1, r2 } = escenario();
    const [ajeno] = db.seed("recepciones", [{ tipo: "remito", proveedor_id: q.id, genera_deuda: true, total: 5 }]);
    expect(err(await vincularRemitos(fac.id, [ajeno.id], p.id))).toMatch(/mismo proveedor/i);

    r1.factura_id = "otra-factura";
    expect(err(await vincularRemitos(fac.id, [r1.id], p.id))).toMatch(/ya está vinculado/i);
    r1.factura_id = null;

    db.seed("pagos_proveedores", [{ recepcion_id: r2.id, monto: 50 }]);
    expect(err(await vincularRemitos(fac.id, [r2.id], p.id))).toMatch(/pagos imputados/i);
    expect(r2).toMatchObject({ factura_id: null, genera_deuda: true });
  });

  it("exige que sea una factura y que haya remitos elegidos", async () => {
    const { p, r1, r2 } = escenario();
    expect(err(await vincularRemitos(r1.id, [r2.id], p.id))).toMatch(/Factura no encontrada/i);
    expect(err(await vincularRemitos("x", [], p.id))).toMatch(/al menos un remito/i);
  });

  it("desvincular devuelve la deuda al remito", async () => {
    const { p, fac, r1 } = escenario();
    await vincularRemitos(fac.id, [r1.id], p.id);
    expect(await desvincularRemito(r1.id, p.id)).toMatchObject({ ok: true });
    expect(r1).toMatchObject({ factura_id: null, genera_deuda: true });
    expect(err(await desvincularRemito(r1.id, p.id))).toMatch(/no está vinculado/i);
  });

  it("un remito vinculado no puede volver a generar deuda sin desvincularlo", async () => {
    const { p, fac, r1 } = escenario();
    await vincularRemitos(fac.id, [r1.id], p.id);
    expect(err(await setGeneraDeuda(r1.id, true, p.id))).toMatch(/desvinculalo/i);
    expect(r1.genera_deuda).toBe(false);
  });
});
