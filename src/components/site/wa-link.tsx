"use client";

import { useWaChat } from "./wa-chat/context";

// Único punto de armado de mensajes de WhatsApp del sitio público. Los botones
// "Pedir" abren el panel de chat en la página (ver wa-chat/); el único <a>
// real hacia wa.me vive en WaChatWidget — ahí es donde el listener global de
// Google Ads (src/components/marketing/google-ads.tsx) sigue detectando la
// conversión, solo que ahora recién al confirmar, no al primer click.

type WaLinkProps = {
  /** @deprecated el número ya lo resuelve WaChatWidget desde el contexto */
  whatsapp?: string;
  message: string;
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
};

export function WaLink({ whatsapp: _whatsapp, message, className, children, ...rest }: WaLinkProps) {
  const { openChat } = useWaChat();
  return (
    <button type="button" className={className} onClick={() => openChat(message)} {...rest}>
      {children}
    </button>
  );
}
