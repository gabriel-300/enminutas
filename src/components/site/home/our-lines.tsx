import Link from "next/link";
import s from "@/styles/site.module.css";
import { Photo, NoPhoto } from "../photo";

const LINES = [
  { nombre: "Mandioca precocida",     foto: "bastoncitos.webp", filtro: "mandioca" },
  { nombre: "Croquetas de mandioca",  foto: "pacu.webp",        filtro: "croquetas" },
  { nombre: "Chipas 3 quesos",        foto: "chipas-canasta.webp", filtro: "chipas" },
  { nombre: "Empanadas",              foto: "emp-pollo.webp",   filtro: "empanadas" },
  { nombre: "Hattogu",                foto: "hattogu.webp",     filtro: "hattogu" },
  { nombre: "Línea góndola 500 g",    foto: "gondola.webp",     filtro: "todos" },
];

export function OurLines() {
  return (
    <section className={s.sec} style={{ paddingTop: 0 }} id="catalogo-destino">
      <div className={s.wrap}>
        <h2 className={s.secT}>Nuestras líneas</h2>
        <div className={s.lines}>
          {LINES.map((l) => (
            <Link key={l.nombre} className={s.line} href={l.filtro === "todos" ? "/tienda" : `/tienda?linea=${l.filtro}`}>
              {l.foto ? <Photo src={`/site/${l.foto}`} alt={l.nombre} /> : <NoPhoto label={l.nombre} />}
              <b>{l.nombre}</b>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
