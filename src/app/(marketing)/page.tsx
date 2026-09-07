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
  const [categories, cms] = await Promise.all([getCategories(true), getContenido()]);

  const heroBadges = [
    cms.hero_badge_1 || "Cadena de frío garantizada",
    cms.hero_badge_2 || "Cero merma",
    cms.hero_badge_3 || "Envíos a todo el país",
  ];

  const STAT_DEFAULTS = [
    { value: "18 m",   label: "Vida útil congelado" },
    { value: "12 min", label: "Para calentar y servir" },
    { value: "5",      label: "Líneas de producto" },
  ];
  // Solo entra en modo CMS si al menos una clave de stat existe en la tabla.
  // Si no hay ninguna → usar defaults (sitio recién configurado).
  // Si hay al menos una → solo mostrar las que tienen valor (las borradas/vacías se ocultan).
  const hasAnyStat = cms.hero_stat_1_valor !== undefined
    || cms.hero_stat_2_valor !== undefined
    || cms.hero_stat_3_valor !== undefined;

  const heroStats: Array<{ value: string; label: string }> = hasAnyStat
    ? [
        { v: cms.hero_stat_1_valor, l: cms.hero_stat_1_label, dl: "Vida útil congelado" },
        { v: cms.hero_stat_2_valor, l: cms.hero_stat_2_label, dl: "Para calentar y servir" },
        { v: cms.hero_stat_3_valor, l: cms.hero_stat_3_label, dl: "Líneas de producto" },
      ].flatMap(({ v, l, dl }) => (!v ? [] : [{ value: v, label: l || dl }]))
    : STAT_DEFAULTS;

  const b2bPerks = [
    cms.b2b_perk_1 || "Precios mayoristas desde la primera compra",
    cms.b2b_perk_2 || "Factura A o B según condición IVA",
    cms.b2b_perk_3 || "Cuenta corriente disponible",
    cms.b2b_perk_4 || "Logística a medida (Posadas y envío al interior)",
    cms.b2b_perk_5 || "Cero merma en cada pedido",
  ].filter(Boolean);

  const comoPasos = [
    { titulo: cms.como_paso_1_titulo || "Consultás por WhatsApp",     desc: cms.como_paso_1_desc || "Escribinos, te contamos qué productos tenemos disponibles y coordinamos la entrega según tu zona." },
    { titulo: cms.como_paso_2_titulo || "Coordinamos pago y entrega", desc: cms.como_paso_2_desc || "Acordamos forma de pago y te organizamos la entrega. Posadas y alrededores, o envío al interior del país." },
    { titulo: cms.como_paso_3_titulo || "Recibís con cadena de frío", desc: cms.como_paso_3_desc || "Producto ultracongelado a −40 °C. Listo para calentar en 12 minutos. Hasta 18 meses de vida útil congelado." },
  ];

  const nosotrosPilares = [
    { titulo: cms.nosotros_pilar_1_titulo || "Planta propia en Posadas",  body: cms.nosotros_pilar_1_body || "Elaboramos en nuestra planta propia. Horno Rational y abatidor Irinox garantizan consistencia industrial en cada lote." },
    { titulo: cms.nosotros_pilar_2_titulo || "La mandioca como base",      body: cms.nosotros_pilar_2_body || "Mandioca, pacú y quesos, elegidos por calidad y trazabilidad. Sostenemos relaciones directas con productores para asegurar consistencia todo el año." },
    { titulo: cms.nosotros_pilar_3_titulo || "Cadena de frío sin cortes",  body: cms.nosotros_pilar_3_body || "Abatimiento a −40 °C post-cocción. Distribución isotérmica hasta cualquier mesa del país." },
    { titulo: cms.nosotros_pilar_4_titulo || "Pensado para tu cocina",      body: cms.nosotros_pilar_4_body || "Porciones consistentes y cero merma: aprovechás el 100% de cada unidad, con el mismo rendimiento en cada pedido." },
  ];

  return (
    <>
      <Navbar />
      <main>
        <Hero
          titulo={cms.hero_titulo}
          descripcion={cms.hero_descripcion}
          imagenUrl={cms.hero_imagen_url || null}
          eyebrow={cms.hero_eyebrow}
          badges={heroBadges}
          stats={heroStats}
        />
        <ChannelSelector
          whatsapp={cms.contacto_whatsapp}
          kicker={cms.canales_kicker}
          titulo={cms.canales_titulo}
          canal1Titulo={cms.canal_1_titulo}
          canal1Subtitulo={cms.canal_1_subtitulo}
          canal1Desc={cms.canal_1_desc}
          canal1Cta={cms.canal_1_cta}
          canal2Titulo={cms.canal_2_titulo}
          canal2Subtitulo={cms.canal_2_subtitulo}
          canal2Desc={cms.canal_2_desc}
          canal2Cta={cms.canal_2_cta}
          canal3Titulo={cms.canal_3_titulo}
          canal3Subtitulo={cms.canal_3_subtitulo}
          canal3Desc={cms.canal_3_desc}
          canal3Cta={cms.canal_3_cta}
        />
        <CategoryGrid
          categories={categories}
          kicker={cms.categorias_kicker}
          titulo={cms.categorias_titulo}
        />
        <FeaturedProduct
          nombre={cms.featured_nombre}
          descripcion={cms.featured_descripcion}
          imagenUrl={cms.featured_imagen_url || null}
          whatsapp={cms.contacto_whatsapp}
          badge={cms.featured_badge}
          lineaHref={cms.featured_linea_href}
          lineaCta={cms.featured_linea_cta}
        />
        <HowItWorks
          titulo={cms.como_titulo}
          pasos={comoPasos}
          whatsapp={cms.contacto_whatsapp}
        />
        <B2BCta
          kicker={cms.b2b_kicker}
          titulo={cms.b2b_titulo}
          parrafo={cms.b2b_parrafo}
          perks={b2bPerks}
          whatsapp={cms.contacto_whatsapp}
          ctaText={cms.b2b_cta_text}
        />
        <Nosotros
          titulo={cms.nosotros_titulo}
          parrafo1={cms.nosotros_parrafo1}
          parrafo2={cms.nosotros_parrafo2}
          pilares={nosotrosPilares}
        />
      </main>
      <Footer
        whatsapp={cms.contacto_whatsapp}
        email={cms.contacto_email}
        instagram={cms.contacto_instagram}
        descripcion={cms.footer_descripcion}
      />
      <WhatsAppButton whatsapp={cms.contacto_whatsapp} />
    </>
  );
}
