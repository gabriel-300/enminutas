import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ChannelSelector } from "@/components/marketing/channel-selector";
import { CategoryGrid } from "@/components/marketing/category-grid";
import { FeaturedProduct } from "@/components/marketing/featured-product";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { B2BCta } from "@/components/marketing/b2b-cta";
import { Nosotros } from "@/components/marketing/nosotros";
import { Footer } from "@/components/marketing/footer";
import { getCategories } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "En Minutas — Cocina ultracongelada de Misiones",
  description:
    "Bocaditos, chipas, pizzas y empanadas elaborados con materia prima del Litoral. Cocidos en horno Rational, ultracongelados con Irinox. Desde Posadas, Misiones.",
};

export default async function LandingPage() {
  const categories = await getCategories();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ChannelSelector />
        <CategoryGrid categories={categories} />
        <FeaturedProduct />
        <HowItWorks />
        <B2BCta />
        <Nosotros />
      </main>
      <Footer />
    </>
  );
}
