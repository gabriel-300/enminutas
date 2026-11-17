import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/site/home/hero";
import { WhoFor } from "@/components/site/home/who-for";
import { OurLines } from "@/components/site/home/our-lines";
import { FeaturedProduct } from "@/components/site/home/featured-product";
import { HowItWorks } from "@/components/site/home/how-it-works";

export const metadata: Metadata = {
  title: "En Minutas — Ultracongelados a base de mandioca",
  description:
    "Ultracongelados a base de mandioca para gastronomía y distribuidores. Listos en 2 a 6 minutos, cero mermas. Envíos a todo el país.",
  openGraph: {
    images: ["/site/bastoncitos-plato.webp"],
  },
};

async function getContenido() {
  const supabase = await createClient();
  const { data } = await supabase.from("contenido_web").select("clave, valor");
  return Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor ?? ""]));
}

export default async function LandingPage() {
  const cms = await getContenido();

  const STAT_DEFAULTS = [
    { value: "2 a 6 min", label: "del freezer a la mesa" },
    { value: "−40 °C", label: "ultracongelado" },
    { value: "Todo el país", label: "envíos con cadena de frío" },
  ];
  const hasAnyStat = cms.hero_stat_1_valor || cms.hero_stat_2_valor || cms.hero_stat_3_valor;
  const stats = hasAnyStat
    ? [
        { v: cms.hero_stat_1_valor, l: cms.hero_stat_1_label, dl: STAT_DEFAULTS[0].label },
        { v: cms.hero_stat_2_valor, l: cms.hero_stat_2_label, dl: STAT_DEFAULTS[1].label },
        { v: cms.hero_stat_3_valor, l: cms.hero_stat_3_label, dl: STAT_DEFAULTS[2].label },
      ].flatMap(({ v, l, dl }) => (!v ? [] : [{ value: v, label: l || dl }]))
    : STAT_DEFAULTS;

  return (
    <>
      <Hero
        whatsapp={cms.contacto_whatsapp}
        titulo={cms.hero_titulo}
        subtitulo={cms.hero_descripcion}
        stats={stats}
      />
      <WhoFor whatsapp={cms.contacto_whatsapp} />
      <OurLines />
      <FeaturedProduct whatsapp={cms.contacto_whatsapp} />
      <HowItWorks />
    </>
  );
}
