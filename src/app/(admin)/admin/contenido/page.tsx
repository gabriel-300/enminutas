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
      <div className="p-8 text-red-400">
        Error al cargar contenido: {error.message}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0f1623" }}>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">Contenido del sitio web</h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a9e" }}>
            Editá los textos e imágenes que aparecen en enminutas.com.ar
          </p>
        </div>
        <ContenidoClient contenido={data ?? []} />
      </div>
    </div>
  );
}
