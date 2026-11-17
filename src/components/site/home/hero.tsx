import Image from "next/image";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { Rays, Blob } from "../decor";
import { WaLink } from "../wa-link";
import { WA_MESSAGES } from "../wa-messages";
import { WhatsAppBadgeIcon } from "../icons";

type Stat = { value: string; label: string };

type HeroProps = {
  whatsapp?: string;
  titulo?: string;
  subtitulo?: string;
  stats: Stat[];
};

export function Hero({ whatsapp, titulo, subtitulo, stats }: HeroProps) {
  return (
    <section className={s.hero}>
      <div className={cn(s.wrap, s.inner)}>
        <div>
          <h1>{titulo || "Ultracongelados a base de mandioca. Listos en 12 minutos."}</h1>
          <p className={s.heroSub}>{subtitulo || "Para restaurantes, hoteles y distribuidores de todo el país. Cero mermas."}</p>
          <div className={s.ctas}>
            <WaLink whatsapp={whatsapp} message={WA_MESSAGES.pedido} className={cn(s.btn, s.pri, s.lg)}>
              <WhatsAppBadgeIcon className={s.waIco} />
              Pedir por WhatsApp
            </WaLink>
            <a className={cn(s.btn, s.out, s.lg)} href="#catalogo-destino">Ver catálogo</a>
          </div>
          <div className={s.stats}>
            {stats.map((st) => (
              <div key={st.label}>
                <b>{st.value}</b>
                <span>{st.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cn(s.art)}>
          <Blob />
          <Rays />
          <div className={s.pack}>
            <Image
              className={s.cut}
              src="/site/noisette-cut.webp"
              alt="Bolsa de Noisette de mandioca En Minutas, 2 kg"
              priority
              fill
              sizes="(max-width: 760px) 90vw, 45vw"
            />
          </div>
        </div>
      </div>
      <Blob style={{ width: 260, height: 260, right: -140, bottom: -60 }} />
    </section>
  );
}
