import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/data/products";
import { groupProductsByLine } from "@/lib/data/product-lines";
import {
  NosotrosHeader,
  NosotrosPilares,
  NosotrosProceso,
  NosotrosCifras,
  NosotrosClientes,
  NosotrosCta,
} from "@/components/site/nosotros/nosotros-sections";

export const metadata: Metadata = {
  title: "Nosotros — En Minutas",
  description:
    "Cocina industrial con alma regional. Planta propia en Posadas, Misiones: mandioca, cadena de frío sin cortes y cero merma.",
};

async function getContenido() {
  const supabase = await createClient();
  const { data } = await supabase.from("contenido_web").select("clave, valor");
  return Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor ?? ""]));
}

export default async function NosotrosPage() {
  const [cms, products] = await Promise.all([getContenido(), getProducts(undefined, true)]);
  const cantidadProductos = groupProductsByLine(products).length;

  const pilares = [
    {
      titulo: cms.nosotros_pilar_1_titulo || "Planta propia",
      body: cms.nosotros_pilar_1_body || "Elaboramos en nuestra planta. Horno Rational y abatidor Irinox garantizan consistencia industrial en cada lote.",
    },
    {
      titulo: cms.nosotros_pilar_2_titulo || "La mandioca como base",
      body: cms.nosotros_pilar_2_body || "Un ingrediente regional, naturalmente libre de gluten, con trazabilidad desde la chacra.",
    },
    {
      titulo: cms.nosotros_pilar_3_titulo || "Cadena de frío sin cortes",
      body: cms.nosotros_pilar_3_body || "Abatimiento a −40 °C después de la cocción y distribución isotérmica hasta cualquier cocina del país.",
    },
    {
      titulo: cms.nosotros_pilar_4_titulo || "Pensado para tu cocina",
      body: cms.nosotros_pilar_4_body || "Porciones parejas y cero merma: aprovechás el 100% de cada unidad, con el mismo rendimiento en cada pedido.",
    },
  ];

  return (
    <>
      <NosotrosHeader
        titulo={cms.nosotros_titulo || "Cocina industrial con alma regional."}
        parrafo1={cms.nosotros_parrafo1 || "Nacimos en Posadas, Misiones, donde la mandioca y la chipa son parte de la mesa de todos los días. Llevamos esos sabores a cocinas profesionales de todo el país, con un proceso industrial que asegura el mismo resultado en cada pedido."}
        parrafo2={cms.nosotros_parrafo2 || "Nuestra línea insignia es a base de mandioca —bastones, noisettes y bocaditos—, elaborada en planta propia. Sumamos chipas gourmet 3 quesos en formato bocadito o long de 115 g, 11 variedades de empanadas de 130 g y más, todo con el mismo proceso: cocción en horno Rational y ultracongelado con tecnología Irinox."}
      />
      <NosotrosPilares pilares={pilares} />
      <NosotrosProceso />
      <NosotrosCifras productos={cantidadProductos} />
      <NosotrosClientes />
      <NosotrosCta whatsapp={cms.contacto_whatsapp} />
    </>
  );
}
