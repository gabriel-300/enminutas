import s from "@/styles/site.module.css";
import { WaLineIcon, TruckIcon, SnowIcon } from "../icons";

const STEPS = [
  { Icon: WaLineIcon, texto: "Hacé tu pedido personalizado directo por WhatsApp" },
  { Icon: TruckIcon,  texto: "Coordinamos el envío de tus productos" },
  { Icon: SnowIcon,   texto: "Lo recibís en tu local o comercio con cadena de frío asegurada" },
];

export function HowItWorks() {
  return (
    <section className={s.sec} id="inicio-como">
      <div className={s.wrap}>
        <h2 className={s.secT}>Cómo trabajamos</h2>
        <div className={s.steps}>
          {STEPS.map((st, i) => (
            <div key={i} className={s.step}>
              <span className={s.n}>{i + 1}</span>
              <st.Icon />
              <b>{st.texto}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
