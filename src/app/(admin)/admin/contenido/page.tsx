import { createClient } from "@/lib/supabase/server";
import { ContenidoClient } from "./contenido-client";

export const metadata = { title: "Contenido web · En Minutas" };

export default async function ContenidoPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contenido_web")
    .select("clave, seccion, etiqueta, tipo, valor, actualizado_en")
    .order("seccion")
    .order("clave");

  if (error) {
    return (
      <div className="p-8 text-danger">
        Error al cargar contenido: {error.message}
      </div>
    );
  }

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-8">
        <h1 className="text-neutral-900">Contenido del sitio web</h1>
        <p className="text-sm mt-1 text-neutral-600">
          Editá los textos e imágenes que aparecen en enminutas.com.ar
        </p>
      </div>
      <ContenidoClient contenido={data ?? []} />
    </div>
  );
}
