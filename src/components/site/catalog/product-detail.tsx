import Link from "next/link";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { Rays } from "../decor";
import { Photo, NoPhoto } from "../photo";
import { WaLink, WA_MESSAGES, waHref } from "../wa-link";
import { WhatsAppBadgeIcon, BoxIcon, BoxesIcon, PotIcon, SnowIcon } from "../icons";
import { LINE_LABELS, photoUrl, porCaja, type ProductGroup } from "@/lib/data/product-lines";

export function ProductDetail({ group, related, whatsapp }: { group: ProductGroup; related: ProductGroup[]; whatsapp?: string }) {
  const foto = photoUrl(group.photo);
  const spec = [
    { Icon: BoxIcon, label: "Presentación", value: group.presentaciones[0] ?? "Consultar" },
    { Icon: BoxesIcon, label: "Por caja", value: porCaja(group) },
    { Icon: PotIcon, label: "Cocción", value: "Horno o freidora · 12 min" },
    { Icon: SnowIcon, label: "Conservación", value: "Freezer −18 °C" },
  ];

  return (
    <section className={s.wrap}>
      <nav className={s.crumb} aria-label="Ruta">
        <Link href="/tienda">Catálogo</Link>
        <span>›</span>
        <Link href={`/tienda?linea=${group.line}`}>{LINE_LABELS[group.line]}</Link>
        <span>›</span>
        <span>{group.name}</span>
      </nav>

      <div className={s.pd}>
        {foto ? <Photo src={foto} alt={group.name} /> : <NoPhoto label={group.name} sublabel={group.presentaciones.join(" · ")} />}
        <div>
          <Rays />
          <span className={s.badge}>Línea {LINE_LABELS[group.line].toLowerCase()}</span>
          <h1>{group.name}</h1>
          <p>{group.description || "Ultracongelado, listo para calentar en pocos minutos."}</p>
          <WaLink whatsapp={whatsapp} message={WA_MESSAGES.producto(group.name)} className={cn(s.btn, s.pri, s.lg)}>
            <WhatsAppBadgeIcon className={s.waIco} />
            Pedir por WhatsApp
          </WaLink>
        </div>
      </div>

      <div className={s.spec}>
        {spec.map(({ Icon, label, value }) => (
          <div key={label}>
            <Icon />
            <b>{label}</b>
            <span>{value}</span>
          </div>
        ))}
      </div>

      {group.presentaciones.length > 1 ? (
        <p className={s.noteB}>También disponible en: {group.presentaciones.slice(1).join(" · ")}.</p>
      ) : null}

      <div className={s.relT}>
        <h2>También te puede interesar</h2>
      </div>
      <div className={s.rel}>
        {related.map((r) => {
          const rFoto = photoUrl(r.photo);
          return (
            <div key={r.slug} className={s.rc}>
              <Link className={s.stretch} href={`/producto/${r.slug}`} aria-label={r.name} />
              {rFoto ? <Photo src={rFoto} alt={r.name} fit={r.fit} /> : <NoPhoto label={r.name} pending />}
              <div className={s.bd}>
                <b>{r.name}</b>
                <a
                  className={cn(s.btn, s.pri, s.sm, s.cta)}
                  href={waHref(whatsapp, WA_MESSAGES.producto(r.name))}
                  target="_blank"
                  rel="noopener"
                >
                  <WhatsAppBadgeIcon className={s.waIco} />
                  Pedir
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
