import Link from "next/link";
import Image from "next/image";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { WaLink, WA_MESSAGES } from "./wa-link";
import { WhatsAppIcon } from "./icons";

type FooterProps = {
  whatsapp?: string;
  email?: string;
  instagram?: string;
};

export function Footer({
  whatsapp = "5493765017944",
  email = "comercial@enminutas.com.ar",
  instagram = "enminutas",
}: FooterProps) {
  const telLabel = `+54 376 ${whatsapp.slice(-7, -4)} ${whatsapp.slice(-4)}`;

  return (
    <footer className={cn(s.ftr, s.tz)}>
      <div className={cn(s.wrap, s.inner)}>
        <Link href="/" className={s.lg}>
          <Image src="/logo.png" alt="En Minutas" width={84} height={84} />
        </Link>
        <span className={s.ftrSep} />
        <WaLink whatsapp={whatsapp} message={WA_MESSAGES.consulta}>
          <WhatsAppIcon className={s.waIco} />
          {telLabel}
        </WaLink>
        <a href={`mailto:${email}`}>{email}</a>
        <span className={s.ftrSep} />
        <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener">
          @{instagram}
        </a>
        <div className={s.ftrCopy}>Ultracongelados a base de mandioca · Envíos a todo el país</div>
      </div>
    </footer>
  );
}
