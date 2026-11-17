// Datos planos (sin "use client"): se importan tanto desde componentes de
// servidor (solo para armar el texto del mensaje) como desde el cliente
// (WaLink, CatalogView, ProductDetail, WaChatWidget). No exportar esto desde
// un archivo "use client" — Next.js no resuelve bien valores planos de un
// módulo cliente cuando se importan desde un Server Component.

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
