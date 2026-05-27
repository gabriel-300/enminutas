import { createClient } from "@/lib/supabase/server";

export interface Category {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  image_url:   string | null;
  sort_order:  number;
}

export interface Product {
  id:                string;
  sku:               string;
  slug:              string;
  name:              string;
  short_description: string | null;
  description:       string | null;
  category_id:       string;
  category:          Category;
  price_b2c:         number;
  price_b2b:         number;
  min_quantity_b2b:  number;
  unit_label:        string;
  weight_grams:      number | null;
  freezer_required:  boolean;
  is_active:         boolean;
  cover_image_url:   string | null;
  extra_images:      string[];
  cooking_methods:   string[];
}

// ─── Supabase queries ────────────────────────────────────────────────────────

const PRODUCT_SELECT = `
  id, sku, slug, name, short_description, description,
  category_id, price_b2c, price_b2b, min_quantity_b2b,
  unit_label, weight_grams, freezer_required, is_active,
  cover_image_url, extra_images, cooking_methods,
  category:categories!category_id (id, slug, name, description, sort_order)
`;

function mapProduct(p: any): Product {
  return {
    id:                p.id,
    sku:               p.sku,
    slug:              p.slug ?? p.sku.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    name:              p.name,
    short_description: p.short_description ?? null,
    description:       p.description       ?? null,
    category_id:       p.category_id,
    category: {
      id:          p.category?.id          ?? p.category_id,
      slug:        p.category?.slug        ?? "",
      name:        p.category?.name        ?? "—",
      description: p.category?.description ?? null,
      image_url:   null,
      sort_order:  p.category?.sort_order  ?? 99,
    },
    price_b2c:        Number(p.price_b2c)        || 0,
    price_b2b:        Number(p.price_b2b)        || 0,
    min_quantity_b2b: p.min_quantity_b2b          ?? 1,
    unit_label:       p.unit_label,
    weight_grams:     p.weight_grams              ?? null,
    freezer_required: p.freezer_required          ?? true,
    is_active:        p.is_active                 ?? true,
    cover_image_url:  p.cover_image_url           ?? null,
    extra_images:     p.extra_images              ?? [],
    cooking_methods:  p.cooking_methods           ?? [],
  };
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order")
    .order("sort_order");
  return (data ?? []).map((c: any) => ({
    id:          c.id,
    slug:        c.slug,
    name:        c.name,
    description: c.description ?? null,
    image_url:   null,
    sort_order:  c.sort_order ?? 99,
  }));
}

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("name");

  if (categorySlug && categorySlug !== "todos") {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  const { data } = await query;
  return (data ?? []).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data ? mapProduct(data) : null;
}

export async function getProductSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true)
    .not("slug", "is", null);
  return (data ?? []).map((p: any) => p.slug).filter(Boolean);
}
