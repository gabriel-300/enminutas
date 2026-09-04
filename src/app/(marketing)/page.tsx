import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ChannelSelector } from "@/components/marketing/channel-selector";
import { CategoryGrid } from "@/components/marketing/category-grid";
import { FeaturedProduct } from "@/components/marketing/featured-product";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { B2BCta } from "@/components/marketing/b2b-cta";
import { Nosotros } from "@/components/marketing/nosotros";
import { Footer } from "@/components/marketing/footer";
import { WhatsAppButton } from "@/components/marketing/whatsapp-button";
import { getCategories } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "En Minutas — Cocina ultracongelada de Misiones",
  description:
    "Bocaditos, chipas, pizzas y empanadas elaborados con materia prima del Litoral. Cocidos en horno Rational, ultracongelados con Irinox. Desde Posadas, Misiones.",
};

async function getContenido() {
  const supabase = await createClient();
  const { data } = await supabase.from("contenido_web").select("clave, valor");
  return Object.fromEntries((data ?? []).map(r => [r.clave, r.valor ?? ""]));
}

export default async function LandingPage() {
  const [categories, cms] = await Promise.all([getCategories(), getContenido()]);

  return (
    <>
      <Navbar />
      <main>
        <Hero
          titulo={cms.hero_titulo}
          descripcion={cms.hero_descripcion}
          imagenUrl={cms.hero_imagen_url || null}
        />
        <ChannelSelector />
        <CategoryGrid categories={categories} />
        <FeaturedProduct
          nombre={cms.featured_nombre}
          descripcion={cms.featured_descripcion}
          imagenUrl={cms.featured_imagen_url || null}
        />
        <HowItWorks />
        <B2BCta />
        <Nosotros
          titulo={cms.nosotros_titulo}
          parrafo1={cms.nosotros_parrafo1}
          parrafo2={cms.nosotros_parrafo2}
        />
      </main>
      <Footer
        whatsapp={cms.contacto_whatsapp}
        email={cms.contacto_email}
        instagram={cms.contacto_instagram}
      />
      <WhatsAppButton whatsapp={cms.contacto_whatsapp} />
    </>
  );
}
