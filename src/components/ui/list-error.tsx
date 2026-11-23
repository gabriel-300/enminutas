import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/** Error de carga para listas server-side: icono + mensaje + reintentar (recarga la misma ruta). */
export function ListError({ title, message, retryHref }: {
  title:     string;
  message?:  string;
  retryHref: string;
}) {
  return (
    <div className="p-8 max-w-md">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      </div>
      {message && <p className="text-sm text-neutral-600 mb-4">{message}</p>}
      <Link
        href={retryHref}
        className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium bg-tierra-700 text-white hover:bg-tierra-800 admin:bg-brand-700 admin:hover:bg-brand-800 transition-colors"
      >
        Reintentar
      </Link>
    </div>
  );
}
