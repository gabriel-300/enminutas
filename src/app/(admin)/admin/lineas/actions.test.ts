import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "@/test/fake-db";

const state = vi.hoisted(() => ({ db: null as any, admin: true }));

vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => state.db }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => {
    if (!state.admin) throw new Error("No autorizado");
    return { id: "admin-1" };
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setLineaVisibleB2B } from "./actions";

let db: FakeDb;
beforeEach(() => {
  db = new FakeDb();
  state.db = db;
  state.admin = true;
});

describe("setLineaVisibleB2B", () => {
  it("solo un administrador puede cambiarlo", async () => {
    state.admin = false;
    expect(await setLineaVisibleB2B(1, true)).toEqual({ error: "No autorizado" });
    expect(db.rows("disponibilidad_lineas")).toHaveLength(0);
  });

  it("habilita una línea que nunca estuvo en el catálogo creando su fila", async () => {
    expect(await setLineaVisibleB2B(7, true)).toEqual({});
    expect(db.rows("disponibilidad_lineas")).toMatchObject([{ linea_id: 7, disponible: true }]);
  });

  it("reactiva una línea que estaba oculta sin duplicar filas", async () => {
    db.seed("disponibilidad_lineas", [{ linea_id: 7, disponible: false, hasta: "2026-10-01" }]);
    await setLineaVisibleB2B(7, true);
    expect(db.rows("disponibilidad_lineas")).toHaveLength(1);
    expect(db.rows("disponibilidad_lineas")[0]).toMatchObject({ disponible: true, hasta: null });
  });

  it("no hace nada si ya estaba visible", async () => {
    db.seed("disponibilidad_lineas", [{ linea_id: 7, disponible: true }]);
    await setLineaVisibleB2B(7, true);
    expect(db.rows("disponibilidad_lineas")).toHaveLength(1);
  });

  it("ocultarla deja la fila con disponible en false y no toca otras líneas", async () => {
    db.seed("disponibilidad_lineas", [{ linea_id: 7, disponible: true }, { linea_id: 8, disponible: true }]);
    await setLineaVisibleB2B(7, false);
    const por = (id: number) => db.rows("disponibilidad_lineas").find(f => f.linea_id === id);
    expect(por(7)!.disponible).toBe(false);
    expect(por(8)!.disponible).toBe(true);
  });
});
