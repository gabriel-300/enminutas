"use client";

import { useState, useTransition, useId } from "react";
import { crearProspecto, avanzarEstado, eliminarProspecto } from "./actions";
import { ESTADOS, FLUJO, type EstadoKey } from "./constants";
import { Plus, X, ChevronRight, Phone, Mail, Calendar, Trash2, TrendingUp } from "lucide-react";

type Prospecto = {
  id: string;
  empresa: string;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  zona: string | null;
  estado: EstadoKey;
  valor_estimado: number | null;
  preventista_id: string | null;
  fecha_proximo_contacto: string | null;
  notas: string | null;
  motivo_perdida: string | null;
  profiles: { full_name: string } | null;
};

type Preventista = { id: string; full_name: string };

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export function PipelineClient({
  prospectos,
  preventistas,
  userRole,
  userId,
}: {
  prospectos: Prospecto[];
  preventistas: Preventista[];
  userRole: string;
  userId: string;
}) {
  const formId = useId();
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoKey | "todos">("todos");
  const [error, setError] = useState<string | null>(null);
  const [perdidoId, setPerdidoId] = useState<string | null>(null);
  const [motivoPerdida, setMotivoPerdida] = useState("");

  // Form state
  const [empresa, setEmpresa]             = useState("");
  const [contacto, setContacto]           = useState("");
  const [telefono, setTelefono]           = useState("");
  const [email, setEmail]                 = useState("");
  const [zona, setZona]                   = useState("");
  const [valor, setValor]                 = useState("");
  const [prevId, setPrevId]               = useState("");
  const [proxContacto, setProxContacto]   = useState("");
  const [notas, setNotas]                 = useState("");

  function resetForm() {
    setEmpresa(""); setContacto(""); setTelefono(""); setEmail("");
    setZona(""); setValor(""); setPrevId(""); setProxContacto(""); setNotas("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa.trim()) { setError("El nombre de la empresa es obligatorio"); return; }
    setError(null);
    start(async () => {
      const res = await crearProspecto({
        empresa, contactoNombre: contacto, contactoTelefono: telefono,
        contactoEmail: email, zona, valorEstimado: valor ? parseFloat(valor) : undefined,
        preventistaId: prevId || undefined, fechaProximoContacto: proxContacto || undefined,
        notas: notas || undefined,
      });
      if (res.error) { setError(res.error); return; }
      resetForm(); setShowForm(false);
    });
  }

  function handleAvanzar(id: string, nuevoEstado: EstadoKey) {
    if (nuevoEstado === "perdido") { setPerdidoId(id); return; }
    start(async () => { await avanzarEstado(id, nuevoEstado); });
  }

  function handlePerdido() {
    if (!perdidoId) return;
    start(async () => {
      await avanzarEstado(perdidoId, "perdido", motivoPerdida);
      setPerdidoId(null); setMotivoPerdida("");
    });
  }

  function handleEliminar(id: string, empresa: string) {
    if (!confirm(`¿Eliminar el prospecto "${empresa}"?`)) return;
    start(async () => { await eliminarProspecto(id); });
  }

  const filtrados = filtroEstado === "todos"
    ? prospectos
    : prospectos.filter(p => p.estado === filtroEstado);

  const labelClass = "block text-xs font-medium text-neutral-500 mb-1";
  const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]";

  return (
    <div className="space-y-5">
      {/* Controles superiores */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroEstado("todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtroEstado === "todos" ? "bg-[#16233f] text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Todos ({prospectos.length})
          </button>
          {ESTADOS.map(e => {
            const count = prospectos.filter(p => p.estado === e.key).length;
            return (
              <button
                key={e.key}
                onClick={() => setFiltroEstado(e.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroEstado === e.key ? "bg-[#16233f] text-white" : `${e.color} hover:opacity-80`
                }`}
              >
                {e.label} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors shrink-0"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Cancelar" : "Nuevo prospecto"}
        </button>
      </div>

      {/* Formulario nuevo prospecto */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Nuevo prospecto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${formId}-emp`} className={labelClass}>Empresa *</label>
                <input id={`${formId}-emp`} type="text" value={empresa}
                  onChange={e => setEmpresa(e.target.value)} className={inputClass} placeholder="Nombre del negocio" required />
              </div>
              <div>
                <label htmlFor={`${formId}-zona`} className={labelClass}>Zona</label>
                <input id={`${formId}-zona`} type="text" value={zona}
                  onChange={e => setZona(e.target.value)} className={inputClass} placeholder="Ej: Palermo, Belgrano..." />
              </div>
              <div>
                <label htmlFor={`${formId}-ctc`} className={labelClass}>Nombre contacto</label>
                <input id={`${formId}-ctc`} type="text" value={contacto}
                  onChange={e => setContacto(e.target.value)} className={inputClass} placeholder="Nombre y apellido" />
              </div>
              <div>
                <label htmlFor={`${formId}-tel`} className={labelClass}>Teléfono</label>
                <input id={`${formId}-tel`} type="tel" value={telefono}
                  onChange={e => setTelefono(e.target.value)} className={inputClass} placeholder="+54 11..." />
              </div>
              <div>
                <label htmlFor={`${formId}-email`} className={labelClass}>Email</label>
                <input id={`${formId}-email`} type="email" value={email}
                  onChange={e => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${formId}-valor`} className={labelClass}>Venta mensual estimada (ARS)</label>
                <input id={`${formId}-valor`} type="number" min="0" step="1" value={valor}
                  onChange={e => setValor(e.target.value)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label htmlFor={`${formId}-prev`} className={labelClass}>Preventista asignado</label>
                <select id={`${formId}-prev`} value={prevId} onChange={e => setPrevId(e.target.value)} className={inputClass}>
                  <option value="">Sin asignar</option>
                  {preventistas.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${formId}-prox`} className={labelClass}>Próximo contacto</label>
                <input id={`${formId}-prox`} type="date" value={proxContacto}
                  onChange={e => setProxContacto(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor={`${formId}-notas`} className={labelClass}>Notas</label>
              <textarea id={`${formId}-notas`} rows={2} value={notas}
                onChange={e => setNotas(e.target.value)} className={inputClass}
                placeholder="Contexto del prospecto, interés detectado, etc." />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={pending}
              className="w-full py-2.5 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50">
              {pending ? "Guardando..." : "Crear prospecto"}
            </button>
          </form>
        </div>
      )}

      {/* Modal motivo pérdida */}
      {perdidoId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-neutral-900 mb-3">Marcar como perdido</h3>
            <p className="text-sm text-neutral-500 mb-4">¿Cuál fue el motivo de la pérdida?</p>
            <textarea
              rows={3}
              value={motivoPerdida}
              onChange={e => setMotivoPerdida(e.target.value)}
              placeholder="Precio, competencia, no le interesó..."
              className={`${inputClass} mb-4`}
            />
            <div className="flex gap-2">
              <button onClick={() => { setPerdidoId(null); setMotivoPerdida(""); }}
                className="flex-1 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50">
                Cancelar
              </button>
              <button onClick={handlePerdido} disabled={pending}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                Confirmar pérdida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de prospectos */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
          <p className="text-sm text-neutral-400">No hay prospectos{filtroEstado !== "todos" ? ` en estado "${ESTADOS.find(e=>e.key===filtroEstado)?.label}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(p => {
            const estado     = ESTADOS.find(e => e.key === p.estado)!;
            const siguiente  = FLUJO[p.estado];
            const sigLabel   = siguiente ? ESTADOS.find(e => e.key === siguiente)?.label : null;
            const hoy        = new Date(); hoy.setHours(0, 0, 0, 0);
            const proxDate   = p.fecha_proximo_contacto ? new Date(p.fecha_proximo_contacto + "T12:00:00") : null;
            const diasRestantes = proxDate ? Math.ceil((proxDate.getTime() - hoy.getTime()) / 86400000) : null;
            const esUrgente  = diasRestantes !== null && diasRestantes <= 0;

            return (
              <div key={p.id}
                className={`bg-white rounded-2xl border p-4 transition-colors ${esUrgente ? "border-amber-300" : "border-neutral-200"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="font-semibold text-neutral-900">{p.empresa}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>
                        {estado.label}
                      </span>
                      {p.zona && (
                        <span className="text-xs text-neutral-400">{p.zona}</span>
                      )}
                    </div>
                    {/* Info línea */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                      {p.contacto_nombre && <span>{p.contacto_nombre}</span>}
                      {p.contacto_telefono && (
                        <a href={`tel:${p.contacto_telefono}`} className="flex items-center gap-1 hover:text-[#16233f]">
                          <Phone className="size-3" />{p.contacto_telefono}
                        </a>
                      )}
                      {p.contacto_email && (
                        <a href={`mailto:${p.contacto_email}`} className="flex items-center gap-1 hover:text-[#16233f]">
                          <Mail className="size-3" />{p.contacto_email}
                        </a>
                      )}
                      {p.valor_estimado !== null && (
                        <span className="flex items-center gap-1 font-medium text-emerald-700">
                          <TrendingUp className="size-3" />{fmt(p.valor_estimado)}/mes
                        </span>
                      )}
                      {p.profiles?.full_name && (
                        <span className="text-neutral-400">→ {p.profiles.full_name}</span>
                      )}
                    </div>
                    {/* Próximo contacto */}
                    {proxDate && (
                      <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${esUrgente ? "text-amber-700" : diasRestantes !== null && diasRestantes <= 3 ? "text-amber-600" : "text-neutral-400"}`}>
                        <Calendar className="size-3" />
                        {esUrgente
                          ? `Contacto vencido (${proxDate.toLocaleDateString("es-AR")})`
                          : `Próximo contacto: ${proxDate.toLocaleDateString("es-AR")} (en ${diasRestantes} días)`}
                      </div>
                    )}
                    {p.notas && (
                      <p className="mt-1.5 text-xs text-neutral-400 italic line-clamp-1">{p.notas}</p>
                    )}
                    {p.estado === "perdido" && p.motivo_perdida && (
                      <p className="mt-1.5 text-xs text-red-500">Motivo: {p.motivo_perdida}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {siguiente && (
                      <button
                        onClick={() => handleAvanzar(p.id, siguiente)}
                        disabled={pending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16233f] text-white text-xs font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-40"
                      >
                        {sigLabel} <ChevronRight className="size-3" />
                      </button>
                    )}
                    {p.estado !== "perdido" && p.estado !== "ganado" && (
                      <button
                        onClick={() => setPerdidoId(p.id)}
                        disabled={pending}
                        className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        Perdido
                      </button>
                    )}
                    {userRole === "admin" && (
                      <button
                        onClick={() => handleEliminar(p.id, p.empresa)}
                        disabled={pending}
                        className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                        title="Eliminar"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
