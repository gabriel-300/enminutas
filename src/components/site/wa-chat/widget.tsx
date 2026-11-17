"use client";

import Image from "next/image";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { useWaChat } from "./context";
import { waHref, WA_MESSAGES } from "../wa-messages";
import { WhatsAppIcon } from "../icons";

export function WaChatWidget({ whatsapp }: { whatsapp?: string }) {
  const { state, openChat, close } = useWaChat();

  return (
    <>
      {state.open && (
        <div className={s.waPanel} role="dialog" aria-label="Chat de WhatsApp">
          <div className={s.waPanelHeader}>
            <Image src="/logo.png" alt="" width={32} height={32} className={s.waPanelAvatar} />
            <div>
              <b>En Minutas</b>
              <span>Normalmente responde rápido</span>
            </div>
            <button type="button" onClick={close} aria-label="Cerrar chat" className={s.waPanelClose}>
              ✕
            </button>
          </div>
          <div className={s.waPanelBody}>
            <p className={s.waBubble}>{state.message}</p>
          </div>
          <div className={s.waPanelFooter}>
            <a
              className={cn(s.btn, s.pri)}
              href={waHref(whatsapp, state.message)}
              target="_blank"
              rel="noopener"
              onClick={close}
            >
              <WhatsAppIcon className={s.waIco} />
              Continuar en WhatsApp
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        className={s.fab}
        aria-label={state.open ? "Cerrar chat de WhatsApp" : "Escribinos por WhatsApp"}
        onClick={() => (state.open ? close() : openChat(WA_MESSAGES.consulta))}
      >
        {state.open ? <span className={s.waFabClose}>✕</span> : <WhatsAppIcon />}
      </button>
    </>
  );
}
