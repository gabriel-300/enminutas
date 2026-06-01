"use client";

import { useState, useTransition } from "react";
import { registrarContacto, guardarNotasCliente } from "@/app/(admin)/admin/preventista/actions";

const TIPOS = [
  { value: "llamada",  label: "📞 Llamada",  emoji: "📞" },
  { value: "visita",   label: "🏪 Visita",   emoji: "🏪" },
  { value: "whatsapp", label: "💬 WhatsApp", emoji: "💬" },
  { value: "email",    label: "✉️ Email",    emoji: "✉️" },
  { value: "otro",     label: "Otro",        emoji: "·"  },
];

type ContactLog = { tipo: string; notas: string | null; created_at: string };

function tipoEmoji(tipo: string) {
  return TIPOS.find((t) => t.value === tipo)?.emoji ?? "·";
}

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function ClienteContactoPanel({
  clienteId,
  notasIniciales,
  historialContactos,
}: {
  clienteId:           string;
  notasIniciales:      string | null;
  historialContactos:  ContactLog[];
}) {
  const ultimoContacto = historialContactos[0] ?? null;

  const [open,      setOpen]      = useState(false);
  const [tab,       setTab]       = useState<"contacto" | "notas" | "historial">("contacto");
  const [notas,     setNotas]     = useState(notasIniciales ?? "");
  const [tipoLog,   setTipoLog]   = useState("llamada");
  const [notasLog,  setNotasLog]  = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [ok,        setOk]        = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleContacto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setOk(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await registrarContacto(fd);
      if ("error" in r) setError(r.error);
      else { setOk(true); setNotasLog(""); setTimeout(() => { setOk(false); setOpen(false); }, 1200); }
    });
  }

  function handleNotas() {
    setError(null);
    startTransition(async () => {
      const r = await guardarNotasCliente(clienteId, notas);
      if ("error" in r) setError(r.error);
      else { setOk(true); setTimeout(() => setOk(false), 1500); }
    });
  }

  return (
    <div>
      {/* Badge último contacto + botón abrir */}
      <div className="flex items-center gap-2 flex-wrap">
        {ultimoContacto ? (
          <span className="text-xs text-neutral-400">
            Últ. contacto: {diasDesde(ultimoContacto.created_at)}d{" "}
            <span className="text-neutral-300">({tipoEmoji(ultimoContacto.tipo)})</span>
          </span>
        ) : (
          <span className="text-xs text-neutral-300">Sin contacto registrado</span>
        )}
        <button
          onClick={() => { setOpen(!open); setError(null); setOk(false); }}
          className="text-xs !text-tierra-700 hover:underline"
        >
          {open ? "Cerrar" : "+ Registrar"}
        </button>
      </div>

      {open && (
        <div className="mt-3 bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-neutral-100 rounded-lg p-0.5 w-fit">
            {(["contacto", "notas", "historial"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors capitalize ${
                  tab === t ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500"
                }`}
              >
                {t === "historial" ? `Historial${historialContactos.length > 0 ? ` (${historialContactos.length})` : ""}` : t === "notas" ? "Notas" : "Contacto"}
              </button>
            ))}
          </div>

          {/* Tab: Contacto */}
          {tab === "contacto" && (
            <form onSubmit={handleContacto} className="space-y-2">
              <input type="hidden" name="cliente_id" value={clienteId} />
              <div className="flex gap-1.5 flex-wrap">
                {TIPOS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipoLog(t.value)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      tipoLog === t.value
                        ? "bg-tierra-700 text-white"
                        : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                <input type="hidden" name="tipo" value={tipoLog} />
              </div>
              <textarea
                name="notas"
                value={notasLog}
                onChange={(e) => setNotasLog(e.target.value)}
                placeholder="Notas del contacto (opcional)"
                rows={2}
                className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 resize-none"
                disabled={isPending}
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50"
                >
                  {isPending ? "…" : "Guardar contacto"}
                </button>
                {ok    && <span className="text-xs text-success">✓ Registrado</span>}
                {error && <span className="text-xs text-danger">{error}</span>}
              </div>
            </form>
          )}

          {/* Tab: Notas */}
          {tab === "notas" && (
            <div className="space-y-2">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones internas sobre este cliente (preferencias, acuerdos, historial…)"
                rows={3}
                className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 resize-none"
                disabled={isPending}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNotas}
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50"
                >
                  {isPending ? "…" : "Guardar notas"}
                </button>
                {ok    && <span className="text-xs text-success">✓ Guardado</span>}
                {error && <span className="text-xs text-danger">{error}</span>}
              </div>
            </div>
          )}

          {/* Tab: Historial */}
          {tab === "historial" && (
            <div>
              {historialContactos.length === 0 ? (
                <p className="text-xs text-neutral-400 py-2">No hay contactos registrados todavía.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {historialContactos.map((c, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="shrink-0 w-5 text-center">{tipoEmoji(c.tipo)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-700 capitalize">{c.tipo}</span>
                          <span className="text-neutral-400">· {fechaCorta(c.created_at)}</span>
                          <span className="text-neutral-300">({diasDesde(c.created_at)}d)</span>
                        </div>
                        {c.notas && (
                          <p className="text-neutral-500 mt-0.5 line-clamp-2">{c.notas}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
