import { getInsumos, getHistorialRecepciones } from "./actions";
import { RecepcionesClient } from "./recepciones-client";

export const metadata = { title: "Recepciones de mercadería" };

export default async function RecepcionesPage() {
  const [insumos, historial] = await Promise.all([
    getInsumos(),
    getHistorialRecepciones(30),
  ]);

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Recepciones de mercadería</h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Registrá facturas o remitos. El sistema suma el stock y actualiza el precio del insumo automáticamente.
        </p>
      </div>
      <RecepcionesClient insumos={insumos} historial={historial} />
    </div>
  );
}
