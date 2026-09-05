import Link from "next/link";
import Image from "next/image";

const productLinks = [
  { href: "/tienda?categoria=chipas",    label: "Chipas" },
  { href: "/tienda?categoria=empanadas", label: "Empanadas" },
  { href: "/tienda?categoria=pizzas",    label: "Pizzas" },
  { href: "/tienda?categoria=bocaditos", label: "Bocaditos" },
];

const companyLinks = [
  { href: "/#nosotros",      label: "Nosotros" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#mayoristas",    label: "Mayoristas" },
  { href: "/contacto",       label: "Contacto" },
];

const WA_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-500 shrink-0" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);
const MAIL_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 shrink-0" aria-hidden>
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
  </svg>
);
const IG_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 shrink-0" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
  </svg>
);
const MAP_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 shrink-0" aria-hidden>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

type FooterProps = {
  whatsapp?: string;
  email?: string;
  instagram?: string;
};

export function Footer({
  whatsapp  = "5493765017944",
  email     = "hola@enminutas.com.ar",
  instagram = "enminutas",
}: FooterProps) {
  const contactLinks = [
    { icon: WA_ICON,   label: `+54 376 ${whatsapp.slice(-7, -4)} ${whatsapp.slice(-4)}`, href: `https://wa.me/${whatsapp}` },
    { icon: MAIL_ICON, label: email,                href: `mailto:${email}` },
    { icon: IG_ICON,   label: `@${instagram}`,      href: `https://instagram.com/${instagram}` },
    { icon: MAP_ICON,  label: "Posadas, Misiones AR", href: "#" },
  ];

  return (
    <footer className="bg-neutral-900 text-white pt-16 pb-8 mt-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex mb-4">
              <Image
                src="/logo.png"
                alt="En Minutas"
                width={100}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed mb-5">
              Ultracongelados a base de mandioca elaborados en planta propia.
              Horno Rational, abatidor Irinox, 18 meses de vida útil.
              Posadas, Misiones — Argentina.
            </p>
            <div className="flex flex-wrap gap-2">
              {["FOR EXPORT", "SENASA al día", "Rational · Irinox"].map((tag) => (
                <span key={tag} className="text-xs text-neutral-300 px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Productos */}
          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">Productos</h5>
            <ul className="flex flex-col gap-2.5">
              {productLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-neutral-400 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">Empresa</h5>
            <ul className="flex flex-col gap-2.5">
              {companyLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-neutral-400 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">Contacto</h5>
            <ul className="flex flex-col gap-3">
              {contactLinks.map(({ icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {icon}
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-neutral-500">
          <p>© 2026 En Minutas · Posadas, Misiones · Argentina</p>
          <p>Coop. de Trabajo Il Pane Nostro Ltda. · CUIT 30-71858060-5</p>
        </div>
      </div>
    </footer>
  );
}
