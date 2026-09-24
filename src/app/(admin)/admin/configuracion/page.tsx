import { Settings, Package, Tag, MapPin, Percent, Users, Building2, UserCog, Sliders, Warehouse, Layers } from "lucide-react";
import { ConfigCard, PageHeader } from "@/components/ui";

const ITEMS = [
  { href: "/admin/productos",    label: "Productos",        icon: Package,   desc: "Catálogo, costos y precios" },
  { href: "/admin/lineas",       label: "Líneas",           icon: Layers,    desc: "Líneas de producto del catálogo" },
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
    <div className="flex flex-col gap-6 p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        icon={<Settings />}
        title="Configuración"
        subtitle="Administración general del sistema"
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <ConfigCard
              key={item.href}
              href={item.href}
              icon={<Icon />}
              title={item.label}
              description={item.desc}
            />
          );
        })}
      </div>
    </div>
  );
}
