import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { WaLink, WA_MESSAGES } from "../wa-link";
import { ClocheIcon, BoxIcon, StoreIcon } from "../icons";

const ITEMS = [
  { Icon: ClocheIcon, titulo: "Gastronomía", texto: "Restaurantes, hoteles y cafeterías. Porciones parejas y cero mermas." },
  { Icon: BoxIcon,    titulo: "Distribuidores", texto: "Precios por volumen y envíos a todo el país." },
  { Icon: StoreIcon,  titulo: "Comercios", texto: "Productos listos para góndola." },
];

export function WhoFor({ whatsapp }: { whatsapp?: string }) {
  return (
    <section className={s.sec} id="inicio-quien">
      <div className={s.wrap}>
        <h2 className={s.secT}>¿Para quién es?</h2>
        <div className={s.who}>
          {ITEMS.map(({ Icon, titulo, texto }) => (
            <WaLink key={titulo} whatsapp={whatsapp} message={WA_MESSAGES.mayorista}>
              <Icon />
              <b>{titulo}</b>
              <p>{texto}</p>
              <span>Consultar condiciones →</span>
            </WaLink>
          ))}
        </div>
      </div>
    </section>
  );
}
