import type { Product } from "./products";

// Agrupamiento visual del catálogo público para el rediseño índigo
// (INSTRUCCIONES.md §4). La tabla de 23 productos vive acá, en código —
// NO se toca category_id en la base, que Damián sigue manejando desde el admin.
// Si aparece un producto activo nuevo que no está en esta tabla, se agrupa
// por nombre y se le asigna línea por palabra clave (ver KEYWORD_LINES).

export type Linea = "mandioca" | "croquetas" | "chipas" | "empanadas" | "hattogu";

export const LINE_LABELS: Record<Linea, string> = {
  mandioca: "Mandioca",
  croquetas: "Croquetas",
  chipas: "Chipas",
  empanadas: "Empanadas",
  hattogu: "Hattogu",
};

export const LINE_FILTERS: Array<{ key: "todos" | Linea; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "mandioca", label: "Mandioca" },
  { key: "croquetas", label: "Croquetas" },
  { key: "chipas", label: "Chipas" },
  { key: "empanadas", label: "Empanadas" },
  { key: "hattogu", label: "Hattogu" },
];

type GroupDef = {
  displayName: string;
  line: Linea;
  slugs: string[];
  photo?: string; // archivo en /site/ — sin foto => tarjeta celeste (placeholder)
  fit?: boolean;  // foto con fondo transparente => object-fit: contain
  coccion?: string; // tiempo real de freidora industrial (POE-HPC-008); sin dato => texto genérico
};

const PRODUCT_GROUPS: GroupDef[] = [
  { displayName: "Bastoncitos de mandioca",              line: "mandioca",   slugs: ["bas-mand-2kg", "bocaditos-mandioca-2kg"],                                    photo: "bastoncitos.webp",  fit: true, coccion: "Freidora 180° · 2 min" },
  { displayName: "Noisette de mandioca",                 line: "mandioca",   slugs: ["boc-nois-2kg", "noisette-mandioca-2kg"],                                     photo: "noisette.webp",     fit: true, coccion: "Freidora 190° · 3 min" },
  { displayName: "Croqueta de mandioca y pacú",          line: "croquetas",  slugs: ["bocaditos-pacu-500g", "boc-pacu-2kg", "bocaditos-pacu-2kg"],                 photo: "pacu.webp",                    coccion: "Freidora 180° · 4-5 min" },
  { displayName: "Croqueta de pollo",                     line: "croquetas",  slugs: ["bocaditos-pollo-500g", "boc-pollo-2kg", "bocaditos-pollo-2kg"],              photo: "pollo.webp",                   coccion: "Freidora 180° · 4-5 min" },
  { displayName: "Croqueta de mandioca y cerdo",         line: "croquetas",  slugs: ["boc-cerdo-2kg", "boc-cer-10kg"],                                             photo: "croq-cerdo.webp",   fit: true, coccion: "Freidora 180° · 4-5 min" },
  { displayName: "Croqueta de mandioca y cordero",       line: "croquetas",  slugs: ["boc-cor-2kg", "boc-cor-10kg"],                                               photo: "croq-cordero.webp", fit: true, coccion: "Freidora 180° · 4-5 min" },
  { displayName: "Bastoncito de mozzarella",             line: "croquetas",  slugs: ["batoncitos-mozzarella-500g", "boc-mozza-2kg", "batoncitos-mozzarella-2kg"],  photo: "mozzarella.webp",               coccion: "Freidora 180° · 3 min" },
  { displayName: "Chipa bocadito premium",               line: "chipas",     slugs: ["chipa-500g"],                                                                photo: "chipa.webp" },
  { displayName: "Chipa bocadito para góndola",          line: "chipas",     slugs: ["chipa-premium-500g"],                                                        photo: "chipa.webp" },
  { displayName: "Chipa long gourmet",                   line: "chipas",     slugs: ["chipa-long-30", "chipa-long-gourmet-x30"],                                   photo: "chipa-long.webp" },
  { displayName: "Chipa panecillo",                      line: "chipas",     slugs: ["chipa-pan-10kg"] },
  { displayName: "Empanada de carne",                     line: "empanadas",  slugs: ["empanadas-carne-x36"],                                                      photo: "emp-carne.webp" },
  { displayName: "Empanada de pollo",                     line: "empanadas",  slugs: ["empanadas-pollo-x36"],                                                      photo: "emp-pollo.webp" },
  { displayName: "Empanada jamón y mozzarella",          line: "empanadas",  slugs: ["empanadas-jamon-x36"],                                                       photo: "emp-jyq.webp" },
  { displayName: "Empanada de pacú",                      line: "empanadas",  slugs: ["empanadas-pacu-x36"],                                                       photo: "emp-pacu.webp" },
  { displayName: "Empanada cheeseburger",                 line: "empanadas",  slugs: ["empanadas-cheeseburger-x36"],                                               photo: "emp-cheese.webp",   fit: true },
  { displayName: "Empanada de carne cortada a cuchillo", line: "empanadas",  slugs: ["empanadas-cuchi-x36"],                                                       photo: "emp-cuchillo.webp", fit: true },
  { displayName: "Empanada de humita",                    line: "empanadas",  slugs: ["empanadas-humita-x36"],                                                     photo: "emp-humita.webp" },
  { displayName: "Empanada caprese",                      line: "empanadas",  slugs: ["empanadas-caprese-x36"],                                                    photo: "emp-caprese.webp" },
  { displayName: "Empanada de verdura",                   line: "empanadas",  slugs: ["empanadas-verdura-x36"],                                                    photo: "emp-verdura.webp" },
  { displayName: "Empanada de acelga",                    line: "empanadas",  slugs: ["empanadas-acelga-x36"],                                                     photo: "emp-acelga.webp" },
  { displayName: "Empanada cebolla y mozzarella",         line: "empanadas",  slugs: ["empanadas-cebolla-x36"],                                                     photo: "emp-cebolla.webp" },
  { displayName: "Hattogu, pancho coreano",               line: "hattogu",    slugs: ["kio-1401"],                                                                  photo: "hattogu-caja.webp", fit: true, coccion: "Freidora 180° · 5-6 min" },
];

// Palabra clave → línea, para productos activos nuevos que todavía no están en PRODUCT_GROUPS.
const KEYWORD_LINES: Array<{ re: RegExp; line: Linea }> = [
  { re: /bastoncit|mandioca/i, line: "mandioca" },
  { re: /noisette/i,           line: "mandioca" },
  { re: /croquet/i,            line: "croquetas" },
  { re: /chipa/i,              line: "chipas" },
  { re: /empanad/i,            line: "empanadas" },
  { re: /hattogu/i,            line: "hattogu" },
];

export type ProductGroup = {
  slug: string;        // slug canónico (primer slug de la tabla, o el único slug si es un producto nuevo sin configurar)
  allSlugs: string[];
  name: string;
  line: Linea;
  photo?: string;
  fit?: boolean;
  coccion?: string;
  presentaciones: string[];
  description: string | null;
  products: Product[];
};

export function groupProductsByLine(products: Product[]): ProductGroup[] {
  const bySlug = new Map<string, GroupDef>();
  for (const g of PRODUCT_GROUPS) for (const slug of g.slugs) bySlug.set(slug, g);

  const groups = new Map<string, { def: GroupDef | null; line: Linea; products: Product[] }>();

  for (const p of products) {
    const def = bySlug.get(p.slug);
    if (def) {
      const key = def.displayName;
      if (!groups.has(key)) groups.set(key, { def, line: def.line, products: [] });
      groups.get(key)!.products.push(p);
      continue;
    }
    const match = KEYWORD_LINES.find((k) => k.re.test(p.name));
    if (!match) continue; // sin línea reconocible (viandas, etc.) → excluido del catálogo público
    const key = p.name;
    if (!groups.has(key)) groups.set(key, { def: null, line: match.line, products: [] });
    groups.get(key)!.products.push(p);
  }

  const result: ProductGroup[] = [];
  for (const [name, { def, line, products: ps }] of groups) {
    const configuredSlugs = def?.slugs ?? [];
    const canonical = configuredSlugs.find((sl) => ps.some((p) => p.slug === sl)) ?? ps[0].slug;
    const allSlugs = ps.map((p) => p.slug);
    const presentaciones = ps.map((p) => p.presentacion || p.unit_label).filter(Boolean) as string[];
    const description = ps.map((p) => p.short_description || p.description).find(Boolean) ?? null;
    result.push({
      slug: canonical,
      allSlugs,
      name: def?.displayName ?? name,
      line,
      photo: def?.photo,
      fit: def?.fit,
      coccion: def?.coccion,
      presentaciones,
      description,
      products: ps,
    });
  }
  // Orden fijo de la tabla de INSTRUCCIONES.md §4 (no alfabético). Los productos
  // nuevos sin configurar (match por palabra clave) van al final, por nombre.
  const orderByName = new Map(PRODUCT_GROUPS.map((g, i) => [g.displayName, i]));
  return result.sort((a, b) => {
    const oa = orderByName.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const ob = orderByName.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    return oa !== ob ? oa - ob : a.name.localeCompare(b.name, "es");
  });
}

export function findGroupBySlug(groups: ProductGroup[], slug: string): ProductGroup | null {
  return groups.find((g) => g.allSlugs.includes(slug)) ?? null;
}

// Ficha técnica, spec "Por caja": kg_caja/bolsas_caja de la fila de caja del grupo,
// o la presentación que diga "Caja" si no hay esos datos cargados (INSTRUCCIONES.md §3.3).
export function porCaja(group: ProductGroup): string {
  const conCaja = group.products.find((p) => p.bolsas_caja || p.kg_caja);
  if (conCaja?.kg_caja) {
    const bolsas = conCaja.bolsas_caja ?? 1;
    return `${bolsas} ${bolsas === 1 ? "bolsa" : "bolsas"} · ${conCaja.kg_caja} kg`;
  }
  const presCaja = group.presentaciones.find((p) => /caja/i.test(p));
  return presCaja ? presCaja.replace(/^caja\s*/i, "") : "Consultar";
}

export function photoUrl(photo: string | undefined) {
  return photo ? `/site/${photo}` : null;
}
