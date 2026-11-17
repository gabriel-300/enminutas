import Image from "next/image";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";

type PhotoProps = {
  src: string;
  alt: string;
  fit?: boolean;
  className?: string;
  sizes?: string;
};

// Foto real dentro de una celda .ph (con tapiz de fondo si la imagen tiene transparencia, vía CSS).
export function Photo({ src, alt, fit, className, sizes = "(max-width: 760px) 50vw, 25vw" }: PhotoProps) {
  return (
    <div className={cn(s.ph, fit && s.fit, className)}>
      <Image src={src} alt={alt} fill sizes={sizes} />
    </div>
  );
}

// Placeholder celeste con tapiz cuando todavía no hay foto cargada para el producto.
export function NoPhoto({ label, sublabel, pending, className }: { label: string; sublabel?: string; pending?: boolean; className?: string }) {
  return (
    <div className={cn(s.ph, className)}>
      <div className={cn(s.nophoto, pending && s.nophotoMk)}>
        {pending ? (
          <>
            <Image src="/logo.png" alt="" width={56} height={56} />
            <small>Foto pendiente</small>
          </>
        ) : (
          <>
            {label}
            {sublabel ? <small>{sublabel}</small> : null}
          </>
        )}
      </div>
    </div>
  );
}
