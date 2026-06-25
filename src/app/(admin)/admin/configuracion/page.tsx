import Link from "next/link";
import { Settings, Package, Tag, Truck, MapPin, Percent, Users, Building2, UserCog, Sliders, Warehouse } from "lucide-react";

const ITEMS = [
  { href: "/admin/productos",    label: "Productos",        icon: Package,   desc: "Catálogo, costos y precios" },
  { href: "/admin/categorias",   label: "Categorías",       icon: Tag,       desc: "Agrupaciones del catálogo" },
  { href: "/admin/canales",      label: "Canales B2B",      icon: Building2, desc: "Configuración de canales de venta" },
  { href: "/admin/zonas",        label: "Zonas",            icon: MapPin,    desc: "Zonas de distribución" },
  { href: "/admin/depositos",    label: "Depósitos",        icon: Warehouse, desc: "Ubicaciones físicas de almacenamiento" },
  { href: "/admin/descuentos",   label: "Descuentos vol.",  icon: Percent,   desc: "Reglas de descuento por volumen" },
  { href: "/admin/clientes-b2b", label: "Clientes B2B",    icon: Users,     desc: "Gestión de clientes mayoristas" },
  { href: "/admin/clientes-b2c", label: "Clientes B2C",    icon: Users,     desc: "Gestión de clientes minoristas" },
  { href: "/admin/staff",        label: "Staff",            icon: UserCog,   desc: "Usuarios y roles del sistema" },
  { href: "/admin/parametros",   label: "Parámetros",       icon: Sliders,   desc: "Variables globales del sistema" },
];

export default function ConfiguracionPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="size-6 text-neutral-400" />
          <h1 className="text-2xl font-bold text-neutral-900 font-display">Configuración</h1>
        </div>
        <p className="text-sm text-neutral-500 ml-9">Administración general del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className="size-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <Icon className="size-4 text-neutral-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800">{item.label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
