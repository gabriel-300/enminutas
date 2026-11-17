// Único punto de armado de links de WhatsApp del sitio público.
// El tracking de conversión de Google Ads es un listener global (GoogleAds,
// en src/components/marketing/google-ads.tsx) que ya captura cualquier
// <a href> con "wa.me" — alcanza con que todo botón use este componente.

export const WA_DEFAULT = "5493765017944";

export const WA_MESSAGES = {
  pedido: "Hola, quería hacer un pedido de productos En Minutas 🛒",
  consulta: "Hola, quería consultar sobre los productos de En Minutas 👋",
  mayorista: "Hola, quería consultar sobre condiciones mayoristas de En Minutas 🏪",
  producto: (nombre: string) => `Hola, quería consultar por ${nombre} de En Minutas 🛒`,
  bastoncitos: "Hola, quería consultar sobre los Bastoncitos de mandioca de En Minutas 🛒",
} as const;

export function waHref(whatsapp: string | undefined, message: string) {
  const numero = (whatsapp || WA_DEFAULT).replace(/[^\d]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

type WaLinkProps = {
  whatsapp?: string;
  message: string;
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
};

export function WaLink({ whatsapp, message, className, children, ...rest }: WaLinkProps) {
  return (
    <a href={waHref(whatsapp, message)} target="_blank" rel="noopener" className={className} {...rest}>
      {children}
    </a>
  );
}
