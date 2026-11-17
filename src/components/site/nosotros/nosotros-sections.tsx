import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { Photo } from "../photo";
import { WaLink, WA_MESSAGES } from "../wa-link";
import { WhatsAppBadgeIcon, StoreIcon, PotIcon, SnowIcon, ClocheIcon } from "../icons";

type Pilar = { titulo: string; body: string };

export function NosotrosHeader({ titulo, parrafo1, parrafo2 }: { titulo: string; parrafo1: string; parrafo2: string }) {
  return (
    <section className={s.wrap}>
      <div className={s.nsH}>
        <div>
          <span className={s.k}>Quiénes somos</span>
          <h1>{titulo}</h1>
          <p>{parrafo1}</p>
          <p>{parrafo2}</p>
        </div>
        <div className={s.pics}>
          <Photo src="/site/bastoncitos-plato.webp" alt="Bastoncitos de mandioca En Minutas" priority />
          <Photo src="/site/chipas-canasta.webp" alt="Chipas En Minutas" priority />
          <Photo src="/site/pacu.webp" alt="Bocaditos de mandioca y pacú En Minutas" priority />
        </div>
      </div>
    </section>
  );
}

const PILAR_ICONS = [StoreIcon, PotIcon, SnowIcon, ClocheIcon];

export function NosotrosPilares({ pilares }: { pilares: Pilar[] }) {
  return (
    <section className={s.sec} style={{ paddingTop: 0 }}>
      <div className={s.wrap}>
        <h2 className={s.secT}>Lo que nos define</h2>
        <div className={s.pil}>
          {pilares.map((p, i) => {
            const Icon = PILAR_ICONS[i];
            return (
              <div key={p.titulo} className={s.tz}>
                <Icon />
                <b>{p.titulo}</b>
                <p>{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const PASOS = [
  { titulo: "Elaboración", texto: "En planta propia, con recetas estandarizadas." },
  { titulo: "Cocción", texto: "Horno Rational: mismo punto en cada lote." },
  { titulo: "Ultracongelado", texto: "Abatidor Irinox a −40 °C." },
  { titulo: "Envío", texto: "Cadena de frío asegurada a todo el país." },
  { titulo: "Servicio", texto: "Del freezer a la mesa en 12 minutos." },
];

export function NosotrosProceso() {
  return (
    <section className={s.sec} style={{ paddingTop: 0 }}>
      <div className={s.wrap}>
        <div className={cn(s.proc)}>
          <h2>Del horno a tu cocina</h2>
          <ol>
            {PASOS.map((p) => (
              <li key={p.titulo}>
                <b>{p.titulo}</b>
                <span>{p.texto}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function NosotrosCifras({ productos }: { productos: number }) {
  const items = [
    { value: "12 min", label: "del freezer a la mesa" },
    { value: "−40 °C", label: "ultracongelado" },
    { value: String(productos), label: "productos en catálogo" },
    { value: "0", label: "merma por pedido" },
  ];
  return (
    <section className={s.sec} style={{ paddingTop: 8 }}>
      <div className={s.wrap}>
        <div className={s.nums}>
          {items.map((it) => (
            <div key={it.label}>
              <b>{it.value}</b>
              <span>{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const CLIENTES = [
  { titulo: "Gastronomía", texto: "Restaurantes, hoteles, cafeterías y catering que necesitan rapidez sin resignar calidad." },
  { titulo: "Distribuidores", texto: "Precios por volumen, logística a medida y una línea completa para ofrecer a sus clientes." },
  { titulo: "Retail", texto: "Comercios y góndolas con la línea de cajas de 500 g lista para vender." },
];

export function NosotrosClientes() {
  return (
    <section className={s.sec} style={{ paddingTop: 8 }}>
      <div className={s.wrap}>
        <h2 className={s.secT}>Con quién trabajamos</h2>
        <div className={s.cli}>
          {CLIENTES.map((c) => (
            <div key={c.titulo}>
              <b>{c.titulo}</b>
              <p>{c.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NosotrosCta({ whatsapp }: { whatsapp?: string }) {
  return (
    <section className={s.sec} style={{ paddingTop: 8 }}>
      <div className={s.wrap}>
        <div className={cn(s.nsCta, s.tz)} style={{ "--tzo": 0.3 } as React.CSSProperties}>
          <h2>¿Querés probar En Minutas en tu cocina?</h2>
          <WaLink whatsapp={whatsapp} message={WA_MESSAGES.mayorista} className={cn(s.btn, s.pri, s.lg)}>
            <WhatsAppBadgeIcon className={s.waIco} />
            Hablemos por WhatsApp
          </WaLink>
        </div>
      </div>
    </section>
  );
}
