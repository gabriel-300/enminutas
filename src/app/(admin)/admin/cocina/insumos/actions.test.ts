import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "@/test/fake-db";

const state = vi.hoisted(() => ({ db: null as any }));

vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => state.db }));
vi.mock("@/lib/auth", () => ({ requireRole: async () => ({ id: "admin-1" }), requireAdmin: async () => ({ id: "admin-1" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { eliminarInsumo } from "./actions";

let db: FakeDb;
beforeEach(() => {
  db = new FakeDb();
  state.db = db;
});

const err = (r: any) => ("error" in r ? r.error : null);

describe("eliminarInsumo", () => {
  it("borra un insumo sin historial", async () => {
    const [i] = db.seed("insumos", [{ nombre: "Grasa" }]);
    expect(await eliminarInsumo(i.id)).toMatchObject({ ok: true });
    expect(db.rows("insumos")).toHaveLength(0);
  });

  it("no borra un insumo que está en una receta", async () => {
    const [i] = db.seed("insumos", [{ nombre: "Mandioca" }]);
    db.seed("recipe_ingredients", [{ insumo_id: i.id }]);
    expect(err(await eliminarInsumo(i.id))).toMatch(/1 receta/);
    expect(db.rows("insumos")).toHaveLength(1);
  });

  it("explica que tiene compras cargadas en vez de mostrar el error de la base", async () => {
    const [i] = db.seed("insumos", [{ nombre: "Arvejas" }]);
    db.seed("recepciones_items", [{ insumo_id: i.id }, { insumo_id: i.id }]);
    db.seed("insumos_movimientos", [{ insumo_id: i.id }, { insumo_id: i.id }]);
    const msg = err(await eliminarInsumo(i.id));
    expect(msg).toMatch(/2 compras/);
    expect(msg).not.toMatch(/foreign key|violates/i);
    expect(db.rows("insumos")).toHaveLength(1);
  });

  it("no borra un insumo con movimientos de stock aunque no tenga compras", async () => {
    const [i] = db.seed("insumos", [{ nombre: "Pilas" }]);
    db.seed("insumos_movimientos", [{ insumo_id: i.id }]);
    expect(err(await eliminarInsumo(i.id))).toMatch(/1 movimiento de stock/);
    expect(db.rows("insumos")).toHaveLength(1);
  });
});
