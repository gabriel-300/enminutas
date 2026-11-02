// Base falsa en memoria con la parte de la API de supabase-js que usan las actions
// (from/select/insert/update/delete/eq/in/order/limit/single/maybeSingle y count head).
// Solo para tests: permite probar la lógica de las Server Actions sin base real.
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null; count?: number | null };

export class FakeDb {
  tables: Record<string, Row[]> = {};
  // Hace fallar el próximo insert en la tabla indicada (con ese mensaje).
  failInsert: Record<string, string> = {};
  // Hace fallar los insert que violen una restricción de unicidad simulada: tabla → columnas.
  unique: Record<string, string[][]> = {};

  seed(table: string, rows: Row[]): Row[] {
    const nuevas = rows.map(r => ({ id: randomUUID(), ...r }));
    this.tables[table] = [...(this.tables[table] ?? []), ...nuevas];
    return nuevas;
  }

  rows(table: string): Row[] {
    return this.tables[table] ?? [];
  }

  from(table: string) {
    return new Query(this, table);
  }
}

class Query {
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private filters: ((r: Row) => boolean)[] = [];
  private payload: any;
  private wantsRows = false;
  private head = false;
  private wantsCount = false;
  private one: "single" | "maybe" | null = null;
  private max: number | null = null;

  constructor(private db: FakeDb, private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode === "select") this.mode = "select";
    this.wantsRows = true;
    this.head = !!opts?.head;
    this.wantsCount = !!opts?.count;
    return this;
  }
  insert(rows: Row | Row[]) { this.mode = "insert"; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(values: Row) { this.mode = "update"; this.payload = values; return this; }
  delete() { this.mode = "delete"; return this; }
  eq(col: string, val: any) { this.filters.push(r => r[col] === val); return this; }
  in(col: string, vals: any[]) { this.filters.push(r => vals.includes(r[col])); return this; }
  order() { return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private run(): Result {
    const rows = this.db.tables[this.table] ?? (this.db.tables[this.table] = []);
    const match = () => rows.filter(r => this.filters.every(f => f(r)));

    if (this.mode === "insert") {
      const fail = this.db.failInsert[this.table];
      if (fail) { delete this.db.failInsert[this.table]; return { data: null, error: { message: fail } }; }
      const nuevos = this.payload.map((p: Row) => ({ id: randomUUID(), ...p }));
      for (const cols of this.db.unique[this.table] ?? []) {
        for (const n of nuevos) {
          const choca = rows.some(r => cols.every(c => String(r[c] ?? "").toLowerCase() === String(n[c] ?? "").toLowerCase() && n[c] != null));
          if (choca) return { data: null, error: { message: `duplicate key value violates unique constraint "${this.table}_${cols.join("_")}_uq"` } };
        }
      }
      rows.push(...nuevos);
      return this.shape(this.wantsRows ? nuevos : null);
    }
    if (this.mode === "update") {
      const hit = match();
      hit.forEach(r => Object.assign(r, this.payload));
      return this.shape(this.wantsRows ? hit : null);
    }
    if (this.mode === "delete") {
      const hit = match();
      this.db.tables[this.table] = rows.filter(r => !hit.includes(r));
      return { data: null, error: null };
    }
    let hit = match();
    if (this.max != null) hit = hit.slice(0, this.max);
    if (this.wantsCount && this.head) return { data: null, error: null, count: hit.length };
    return { ...this.shape(hit), count: this.wantsCount ? hit.length : undefined };
  }

  private shape(data: Row[] | null): Result {
    if (this.one === "single") {
      if (!data || data.length !== 1) return { data: null, error: { message: "no rows" } };
      return { data: data[0], error: null };
    }
    if (this.one === "maybe") return { data: data?.[0] ?? null, error: null };
    return { data, error: null };
  }

  then(resolve: (r: Result) => any, reject?: (e: any) => any) {
    try { return Promise.resolve(this.run()).then(resolve, reject); }
    catch (e) { return Promise.reject(e).then(resolve, reject); }
  }
}
