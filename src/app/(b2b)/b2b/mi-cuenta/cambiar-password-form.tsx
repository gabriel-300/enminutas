"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function CambiarPasswordForm() {
  const [open,    setOpen]    = useState(false);
  const [nueva,   setNueva]   = useState("");
  const [confirma, setConfirma] = useState("");
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok,      setOk]      = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (nueva !== confirma) { setError("Las contraseñas no coinciden."); return; }

    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: err } = await supabase.auth.updateUser({ password: nueva });
    setLoading(false);

    if (err) { setError(err.message); return; }
    setOk(true);
    setNueva(""); setConfirma("");
    setTimeout(() => { setOk(false); setOpen(false); }, 2500);
  }

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 mb-4 overflow-hidden">
      <button
        onClick={() => { setOpen(o => !o); setError(null); setOk(false); }}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-neutral-900">Cambiar contraseña</p>
          <p className="text-xs text-neutral-400 mt-0.5">Actualizá tu contraseña de acceso al portal</p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-1 border-t border-neutral-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={nueva}
                onChange={e => setNueva(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                disabled={loading}
                className="w-full px-3 py-2.5 pr-10 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                tabIndex={-1}
              >
                {show ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type={show ? "text" : "password"}
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              placeholder="Repetí la contraseña"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {ok && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              ✓ Contraseña actualizada correctamente.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Guardando…" : "Guardar nueva contraseña"}
          </button>
        </form>
      )}
    </section>
  );
}
