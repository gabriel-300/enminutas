import Link from "next/link";
import { Phone, Mail, Camera, MapPin } from "lucide-react";
// lucide-react v1 no tiene Instagram — usamos Camera como sustituto visual

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

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-white pt-16 pb-8 mt-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <span className="size-8 rounded-lg bg-tierra-700 text-white flex items-center justify-center font-bold text-sm">
                EM
              </span>
              <span className="font-display font-semibold text-lg text-white">En Minutas</span>
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed mb-5">
              Finger Food Regional. Cocina ultracongelada elaborada en Posadas,
              Misiones — Argentina. Proceso industrial, sabor de monte.
            </p>
            <div className="flex flex-wrap gap-2">
              {["FOR EXPORT", "SENASA al día", "Rational · Irinox"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white/8 text-neutral-300 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Productos */}
          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Productos
            </h5>
            <ul className="flex flex-col gap-2.5">
              {productLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Empresa
            </h5>
            <ul className="flex flex-col gap-2.5">
              {companyLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Contacto
            </h5>
            <ul className="flex flex-col gap-3">
              {[
                {
                  icon: Phone,
                  label: "+54 376 4571529",
                  href: "https://wa.me/5493764571529",
                },
                {
                  icon: Mail,
                  label: "hola@enminutas.com.ar",
                  href: "mailto:hola@enminutas.com.ar",
                },
                {
                  icon: Camera,
                  label: "@enminutas",
                  href: "https://instagram.com/enminutas",
                },
                {
                  icon: MapPin,
                  label: "Posadas, Misiones AR",
                  href: "#",
                },
              ].map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    <Icon className="size-3.5 text-neutral-500 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-neutral-500">
          <p>© 2026 En Minutas · Misiones · Argentina</p>
          <p>Panadería Petri SA · CUIT 30-XXXXXXXX-X</p>
        </div>
      </div>
    </footer>
  );
}
