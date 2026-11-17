import s from "@/styles/site.module.css";
import { WaLink, WA_MESSAGES } from "./wa-link";
import { WhatsAppIcon } from "./icons";

export function WhatsAppFab({ whatsapp }: { whatsapp?: string }) {
  return (
    <WaLink whatsapp={whatsapp} message={WA_MESSAGES.consulta} className={s.fab} aria-label="Escribinos por WhatsApp">
      <WhatsAppIcon />
    </WaLink>
  );
}
