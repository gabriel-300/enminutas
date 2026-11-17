import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/data/products";
import { groupProductsByLine, findGroupBySlug, photoUrl } from "@/lib/data/product-lines";
import { ProductDetail } from "@/components/site/catalog/product-detail";

async function getGroups() {
  const products = await getProducts(undefined, true);
  return groupProductsByLine(products);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const groups = await getGroups();
  const group = findGroupBySlug(groups, slug);
  if (!group) return {};
  const foto = photoUrl(group.photo);
  return {
    title: group.name,
    description: group.description ?? undefined,
    openGraph: {
      title: `${group.name} · En Minutas`,
      description: group.description ?? undefined,
      images: foto ? [foto] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const groups = await getGroups();
  const group = findGroupBySlug(groups, slug);
  if (!group) notFound();

  const related = groups.filter((g) => g.slug !== group.slug && g.photo).slice(0, 4);

  return <ProductDetail group={group} related={related} />;
}
