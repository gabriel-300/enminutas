"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { LINE_FILTERS, photoUrl, type ProductGroup } from "@/lib/data/product-lines";
import { Photo, NoPhoto } from "../photo";
import { WA_MESSAGES } from "../wa-messages";
import { useWaChat } from "../wa-chat/context";
import { SearchIcon, WhatsAppBadgeIcon } from "../icons";
import { Rays } from "../decor";

function sinTildes(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Card({ group }: { group: ProductGroup }) {
  const { openChat } = useWaChat();
  const foto = photoUrl(group.photo);
  const pres = group.presentaciones.join(" · ");

  const pedirBtn = (
    <button type="button" className={cn(s.btn, s.pri, s.sm, s.cta)} onClick={() => openChat(WA_MESSAGES.producto(group.name))}>
      <WhatsAppBadgeIcon className={s.waIco} />
      Pedir
    </button>
  );

  if (!foto) {
    return (
      <div className={cn(s.card, s.cardNp)}>
        <Link className={s.stretch} href={`/producto/${group.slug}`} aria-label={group.name} />
        <NoPhoto label={group.name} />
        <div className={s.bd}>
          <span className={s.pres}>{pres}</span>
          {pedirBtn}
        </div>
      </div>
    );
  }
  return (
    <div className={s.card}>
      <Link className={s.stretch} href={`/producto/${group.slug}`} aria-label={group.name} />
      <Photo src={foto} alt={group.name} fit={group.fit} />
      <span className={s.tag}>{LINE_FILTERS.find((f) => f.key === group.line)?.label}</span>
      <div className={s.bd}>
        <h3>{group.name}</h3>
        <span className={s.pres}>{pres}</span>
        {pedirBtn}
      </div>
    </div>
  );
}

export function CatalogView({ groups, initialLine }: { groups: ProductGroup[]; initialLine?: string }) {
  const [line, setLine] = useState<string>(initialLine && LINE_FILTERS.some((f) => f.key === initialLine) ? initialLine : "todos");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return groups.filter((g) => (line === "todos" || g.line === line) && (!q || sinTildes(g.name).includes(sinTildes(q))));
  }, [groups, line, q]);

  return (
    <section className={s.wrap}>
      <div className={s.catH}>
        <Rays />
        <h1>Catálogo</h1>
        <p>Elegí la línea y pedí por WhatsApp.</p>
      </div>

      <div className={s.bar} role="group" aria-label="Filtrar por línea">
        {LINE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={cn(s.chip, line === f.key && s.chipOn)}
            aria-pressed={line === f.key}
            onClick={() => setLine(f.key)}
          >
            {f.label}
          </button>
        ))}
        <label className={s.search}>
          <SearchIcon />
          <input
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      <div className={s.grid}>
        {list.length === 0 ? (
          <p className={s.empty}>No encontramos productos con ese nombre. Escribinos por WhatsApp y te ayudamos.</p>
        ) : (
          list.map((g) => <Card key={g.slug} group={g} />)
        )}
      </div>
    </section>
  );
}
