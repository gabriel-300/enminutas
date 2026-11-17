import Image from "next/image";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { Rays } from "../decor";
import { WaLink } from "../wa-link";
import { WA_MESSAGES } from "../wa-messages";
import { WhatsAppBadgeIcon } from "../icons";

export function FeaturedProduct({ whatsapp }: { whatsapp?: string }) {
  return (
    <section className={s.sec} style={{ paddingTop: 8 }}>
      <div className={s.wrap}>
        <div className={cn(s.flag, s.tz)}>
          <Rays />
          <div className={s.tx}>
            <span className={s.k}>Producto insignia</span>
            <h2>Bastoncitos de mandioca</h2>
            <p>Mandioca precocida, crocante por fuera y suave por dentro. Lista en 2 minutos en freidora. Cero mermas.</p>
            <WaLink whatsapp={whatsapp} message={WA_MESSAGES.bastoncitos} className={cn(s.btn, s.wht)}>
              <WhatsAppBadgeIcon className={s.waIco} />
              Pedir Bastoncitos por WhatsApp
            </WaLink>
          </div>
          <div className={s.pk}>
            <div className={s.pkFoto}>
              <Image className={s.foto} src="/site/bastoncitos-plato.webp" alt="Bastoncitos de mandioca En Minutas servidos" fill sizes="(max-width: 760px) 300px, 400px" />
            </div>
          </div>
          <div className={s.chef}>
            <div className={s.av}>
              <Image src="/site/gunther.webp" alt="Chef Gunther Moros" width={280} height={420} />
            </div>
            <b>Gunther Moros</b>
            <div className={s.rl}>Chef aliado</div>
            <hr />
            <q>Calidad y practicidad en cada preparación.</q>
          </div>
        </div>
      </div>
    </section>
  );
}
