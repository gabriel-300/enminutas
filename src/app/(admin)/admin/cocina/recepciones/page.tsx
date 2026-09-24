import { getInsumos, getHistorialRecepciones } from "./actions";
import { RecepcionesClient } from "./recepciones-client";

export const metadata = { title: "Recepciones de mercadería" };

export default async function RecepcionesPage() {
  const [insumos, historial] = await Promise.all([
    getInsumos(),
    getHistorialRecepciones(30),
  ]);

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Recepciones de mercadería</h1>
        <p className="text-sm text-neutral-600 mt-0.5">
          Registrá facturas o remitos. El sistema suma el stock y actualiza el precio del insumo automáticamente.
        </p>
      </div>
      <RecepcionesClient insumos={insumos} historial={historial} />
    </div>
  );
}
