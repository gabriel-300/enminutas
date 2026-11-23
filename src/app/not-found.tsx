import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonStyles } from "@/components/ui/button-styles";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-crema-50">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tierra-50 text-tierra-700">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Página no encontrada</h1>
        <p className="text-sm text-neutral-600 mb-6">
          La página que buscás no existe o fue movida.
        </p>
        <Link href="/" className={buttonStyles("primary", "md")}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
