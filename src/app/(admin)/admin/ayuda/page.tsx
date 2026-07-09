import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "Ayuda — En Minutas" };

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 bg-neutral-50">
        <span className="text-tierra-700">{icon}</span>
        <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
      </div>
      <div className="px-5 py-4 text-sm text-neutral-700 space-y-4">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 size-5 rounded-full bg-tierra-700 text-white text-xs flex items-center justify-center font-semibold mt-0.5">
            {i + 1}
          </span>
          <span className="text-neutral-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

const ESTADOS = [
  { key: "pending_payment", label: "Pendiente de pago",  color: "bg-yellow-100 text-yellow-800", desc: "El pedido fue cargado pero el cliente aún no confirmó el pago." },
  { key: "aprobado",        label: "Aprobado",           color: "bg-blue-100 text-blue-800",     desc: "El pago fue confirmado. El pedido entra en cola de producción." },
  { key: "enviado_prod",    label: "En producción",      color: "bg-purple-100 text-purple-800", desc: "El equipo de cocina está preparando el pedido." },
  { key: "despachado",      label: "Despachado",         color: "bg-orange-100 text-orange-800", desc: "El pedido está listo y esperando al repartidor." },
  { key: "en_distribucion", label: "En distribución",   color: "bg-sky-100 text-sky-800",       desc: "El repartidor está en camino con el pedido." },
  { key: "delivered",       label: "Entregado",          color: "bg-green-100 text-green-800",   desc: "El pedido fue entregado correctamente al cliente." },
  { key: "entrega_parcial", label: "Entrega parcial",    color: "bg-amber-100 text-amber-800",   desc: "Se entregó solo una parte del pedido. El resto queda pendiente." },
  { key: "liquidado",       label: "Liquidado",          color: "bg-neutral-200 text-neutral-700", desc: "La comisión fue calculada y el pedido está cerrado contablemente." },
];

const CANALES = [
  { slug: "dist",   label: "Distribuidor", desc: "Clientes que revenden el producto. Tienen el margen más alto." },
  { slug: "min",    label: "Minorista",    desc: "Comercios que venden al público. Margen intermedio." },
  { slug: "gastro", label: "Gastronomía",  desc: "Restaurantes, pizzerías, etc. Precio específico para el rubro." },
];

export default async function AyudaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;

  const esAdmin      = role === "admin";
  const esVendedor   = role === "vendedor";
  const esProduccion = role === "produccion";
  const esDistrib    = role === "distribucion";

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-5">

      <div>
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Ayuda del sistema</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Guías y referencia rápida para usar En Minutas.
        </p>
      </div>

      {/* ── Estados de pedido — visible para todos ── */}
      <Section
        title="Estados de un pedido"
        icon={
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        <p className="text-neutral-500 text-xs">Los pedidos avanzan por estos estados en orden:</p>
        <div className="space-y-2.5">
          {ESTADOS.map((e) => (
            <div key={e.key} className="flex items-start gap-3">
              <StatusBadge label={e.label} color={e.color} />
              <span className="text-xs text-neutral-600 leading-relaxed pt-0.5">{e.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Preventista / Vendedor ── */}
      {(esAdmin || esVendedor) && (
        <>
          <Section
            title="Cómo cargar un pedido"
            icon={
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
          >
            <Steps items={[
              "Ir a Pedidos → + Nuevo pedido.",
              "Seleccionar el cliente B2B. Los precios se calculan automáticamente según su canal (distribuidor, minorista, etc.).",
              "Elegir la dirección de entrega. El sistema calcula el flete según la zona.",
              "Buscar y agregar productos usando el buscador o los filtros por línea. Escribir la cantidad en el campo o usar los botones + / −.",
              "En el panel derecho elegir la forma de pago y el estado inicial del pedido.",
              "Hacer click en Crear pedido. El cliente recibe un email de confirmación.",
            ]} />
            <div className="mt-3 p-3 bg-crema-50 rounded-xl border border-tierra-700/10 text-xs text-neutral-600">
              <strong>Estado inicial:</strong> Si el pago ya está confirmado elegí <em>Aprobado</em> para que el pedido entre directamente a producción. Si el cliente va a pagar después, elegí <em>Pendiente de pago</em>.
            </div>
          </Section>

          <Section
            title="Lista de precios e impresión"
            icon={
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          >
            <Steps items={[
              "Ir a Preventista → Lista de precios.",
              "Seleccionar el canal del cliente (Distribuidor / Minorista / Gastronomía).",
              "Hacer click en Imprimir para generar una versión para papel o PDF.",
            ]} />
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Canales de precio</p>
              {CANALES.map((c) => (
                <div key={c.slug} className="flex items-start gap-2 text-xs">
                  <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 shrink-0">{c.slug}</span>
                  <span className="text-neutral-600">{c.desc}</span>
                </div>
              ))}
              <p className="text-xs text-neutral-400 italic">Los precios incluyen IVA. El precio s/IVA es para Factura A.</p>
            </div>
          </Section>

          <Section
            title="Simulador de pedido"
            icon={
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          >
            <p className="text-neutral-600">El simulador calcula el total de un pedido sin crearlo en el sistema. Útil para presupuestar antes de hablar con el cliente.</p>
            <Steps items={[
              "Ir a Preventista → Simulador.",
              "Seleccionar el canal del cliente.",
              "Agregar productos y cantidades. El total se actualiza en tiempo real.",
              "Si el cliente tiene percepciones de IIBB, usar el botón + para agregarlas: escribir la descripción y el porcentaje.",
              "Hacer click en Imprimir para entregar el presupuesto.",
            ]} />
            <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
              <strong>Percepciones IIBB:</strong> Ingresos Brutos es un impuesto provincial. No todos los clientes lo pagan. El porcentaje varía según la provincia y la actividad. Consultá con administración si no sabés qué porcentaje aplicar.
            </div>
          </Section>

          <Section
            title="Muestras"
            icon={
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            }
          >
            <p className="text-neutral-600">Las muestras son envíos sin costo para que los clientes potenciales prueben los productos. Se numeran con el prefijo <strong>MST-YYYY-NNNN</strong>.</p>
            <Steps items={[
              "Ir a Comercial → Muestras → Nueva muestra.",
              "Completar el destinatario (nombre del cliente o local).",
              "Seleccionar los productos marcados como muestra y las cantidades.",
              "Crear la muestra. Queda en estado Aprobado.",
              "Producción la prepara y cambia el estado a En producción, luego a Despachado.",
            ]} />
            <div className="mt-3 p-3 bg-crema-50 rounded-xl border border-tierra-700/10 text-xs text-neutral-600">
              <strong>Stock:</strong> Las muestras descuentan stock igual que un pedido normal. El campo total siempre es $0. No requieren cliente registrado en el sistema.
            </div>
          </Section>
        </>
      )}

      {/* ── Producción ── */}
      {(esAdmin || esProduccion) && (
        <>
          <Section
            title="Producción — flujo de trabajo"
            icon={
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            }
          >
            <Steps items={[
              "Los pedidos con estado Aprobado aparecen en la sección Producción listos para preparar. Las muestras (MST-) también aparecen aquí.",
              "Al empezar a preparar un pedido, cambiá el estado a En producción.",
              "Cuando el pedido está listo para ser retirado, cambiá el estado a Despachado. Esto descuenta el stock automáticamente.",
              "Desde Cocina podés ver todos los productos pendientes agrupados para preparar en lote.",
              "Cocina → Planificador muestra qué hay que preparar cada día según los pedidos activos.",
              "Cocina → Lista de compras genera automáticamente los insumos necesarios.",
            ]} />
          </Section>

          <Section
            title="Stock y lotes de producción"
            icon={
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            }
          >
            <p className="text-neutral-600">El stock del sistema refleja las unidades físicas disponibles. Se actualiza de dos formas: <strong>suma</strong> cuando se registra un lote de producción, <strong>resta</strong> cuando se despacha un pedido.</p>
            <Steps items={[
              "Ir a Cocina → Stock. Acá se ve el inventario actual por producto.",
              "Para agregar stock: ir a Cocina y hacer click en + Registrar (botón naranja). Completar el producto y la cantidad de unidades producidas.",
              "El sistema guarda el lote con fecha y hora. Se puede ver el historial en Cocina → Lotes.",
              "Cuando un pedido pasa a Despachado, el sistema descuenta automáticamente las unidades del stock.",
            ]} />
            <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
              <strong>¿Por qué aparece "Sin stock"?</strong> Si un producto no tiene lotes registrados, el stock es cero. Hay que registrar la producción del día antes de que los repartidores empiecen a despachar.
            </div>
          </Section>
        </>
      )}

      {/* ── Distribución ── */}
      {(esAdmin || esDistrib) && (
        <Section
          title="Distribución — flujo de trabajo"
          icon={
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          }
        >
          <Steps items={[
            "Los pedidos con estado Despachado aparecen en la sección Distribución listos para repartir.",
            "Al salir a entregar, cambiá el estado a En distribución.",
            "Al confirmar la entrega completa, cambiá el estado a Entregado.",
            "Si solo pudiste entregar una parte, usá Entrega parcial y anotá qué faltó en las notas.",
          ]} />
        </Section>
      )}

      {/* ── Admin ── */}
      {esAdmin && (
        <Section
          title="Administración — referencia rápida"
          icon={
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        >
          <div className="space-y-3">
            {[
              { label: "Actualizar precio de un producto", desc: "Configuración → Productos → editar producto → cambiar Costo. Los precios de todos los canales se recalculan automáticamente." },
              { label: "Cambiar márgenes de un canal", desc: "Configuración → Canales B2B → editar el canal. Los precios se actualizan al instante." },
              { label: "Agregar una nueva zona de entrega", desc: "Configuración → Zonas → Nueva zona. Definí nombre, km de distancia y precio por km." },
              { label: "Crear un pedido aprobado directamente", desc: "Pedidos → Nuevo pedido → Estado inicial: Aprobado. El pedido entra directamente a producción sin pasar por pendiente de pago." },
              { label: "Ver comisiones del mes", desc: "Preventista → ver la tarjeta de comisión de cada vendedor. Reportes para el total general." },
              { label: "Liquidar comisiones IDEIA", desc: "Liquidaciones → Nueva liquidación → seleccionar período. El sistema calcula automáticamente el GMV y la comisión." },
            ].map((item, i) => (
              <div key={i} className="border-l-2 border-tierra-700/20 pl-3">
                <p className="font-medium text-neutral-800 text-xs">{item.label}</p>
                <p className="text-neutral-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Asistente IA ── */}
      <Section
        title="Asistente IA"
        icon={
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      >
        <p>El botón de chat (abajo a la derecha) abre el asistente. Podés preguntarle:</p>
        <ul className="space-y-1.5 mt-2">
          {[
            "¿Cuánto sale la pizza Margarita para distribuidor?",
            "¿Qué pedidos están esperando producción?",
            "Buscar pedido B2B-2025-0001",
            "¿Cuánto sale la pizza por unidad?",
          ].map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-neutral-600">
              <span className="text-tierra-700 shrink-0 mt-0.5">›</span>
              <em>"{q}"</em>
            </li>
          ))}
        </ul>
        <p className="text-xs text-neutral-400 mt-3">El asistente consulta los datos reales del sistema. No inventa precios ni pedidos.</p>
      </Section>

      <p className="text-xs text-neutral-400 pb-4">
        ¿Encontraste un error o algo no funciona como esperabas?{" "}
        <Link href="/admin/dashboard" className="underline hover:text-neutral-600">Volver al inicio</Link>
      </p>
    </div>
  );
}
