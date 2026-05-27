"use client";

import { useState, useTransition } from "react";
import { crearClienteB2C, resetearPasswordClienteB2C, eliminarClienteB2C } from "@/app/(admin)/admin/clientes-b2c/actions";

type Cliente = {
  id:           string;
  email:        string;
  name:         string | null;
  phone:        string | null;
  created_at:   string;
  last_sign_in: string | null;
  confirmed:    boolean;
};

function fmtDate(s: string | null) {
  if (!s) return "Nunca";
  return new Date(s).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function ClienteRow({ cliente }: { cliente: Cliente }) {
  const [showReset, setShowReset] = useState(false);
  const [newPw, setNewPw]         = useState("");
  const [msg,   setMsg]           = useState<string | null>(null);
  const [err,   setErr]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${cliente.email}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      try { await eliminarClienteB2C(cliente.id); }
      catch (e: any) { setErr(e.message); }
    });
  }

  function handleResetPw(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setMsg(null);
    startTransition(async () => {
      try {
        await resetearPasswordClienteB2C(cliente.id, newPw);
        setMsg("Contraseña actualizada");
        setNewPw("");
        setShowReset(false);
      } catch (e: any) { setErr(e.message); }
    });
  }

  return (
    <>
      <tr className="hover:bg-neutral-50 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium text-sm text-neutral-900">{cliente.name ?? cliente.email}</p>
          {cliente.name && <p className="text-xs text-neutral-400">{cliente.email}</p>}
          {!cliente.confirmed && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">sin confirmar</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-neutral-500">{cliente.phone ?? "—"}</td>
        <td className="px-4 py-3 text-xs text-neutral-400">{fmtDate(cliente.created_at)}</td>
        <td className="px-4 py-3 text-xs text-neutral-400">{fmtDate(cliente.last_sign_in)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowReset(!showReset); setErr(null); setMsg(null); }}
              className="text-xs text-neutral-500 hover:text-neutral-800 hover:underline"
            >
              Contraseña
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-danger hover:underline disabled:opacity-40"
            >
              Eliminar
            </button>
          </div>
          {msg && <p className="text-xs text-success mt-1">{msg}</p>}
          {err && <p className="text-xs text-danger mt-1">{err}</p>}
        </td>
      </tr>
      {showReset && (
        <tr>
          <td colSpan={5} className="px-4 pb-3">
            <form onSubmit={handleResetPw} className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                minLength={8}
                required
                disabled={isPending}
                className="flex-1 px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
              />
              <button type="submit" disabled={isPending}
                className="px-3 py-1.5 text-xs rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
                {isPending ? "Guardando…" : "Guardar"}
              </button>
              <button type="button" onClick={() => setShowReset(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700">✕</button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function CrearClienteForm() {
  const [isPending, startTransition] = useTransition();
  const [open,    setOpen]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd   = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null); setSuccess(null);
    startTransition(async () => {
      try {
        await crearClienteB2C(fd);
        setSuccess(`Cliente creado correctamente.`);
        form.reset();
      } catch (err: any) {
        setError(err.message ?? "Error al crear el cliente");
      }
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-neutral-800">Crear cliente manualmente</h2>
        <button
          onClick={() => { setOpen(!open); setError(null); setSuccess(null); }}
          className="text-xs text-tierra-700 hover:underline"
        >
          {open ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {!open && (
        <p className="text-xs text-neutral-400">
          Creá una cuenta B2C directamente sin que el cliente tenga que registrarse.
        </p>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre completo</label>
              <input name="name" placeholder="Juan Pérez" className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Teléfono</label>
              <input name="phone" placeholder="+54 376 ..." className={inputCls} disabled={isPending} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Email *</label>
            <input name="email" type="email" required placeholder="cliente@email.com" className={inputCls} disabled={isPending} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Contraseña *</label>
              <input name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Confirmar *</label>
              <input name="password_confirm" type="password" required minLength={8} placeholder="Repetir" className={inputCls} disabled={isPending} />
            </div>
          </div>

          {error   && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-success">{success}</p>}

          <button type="submit" disabled={isPending}
            className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors">
            {isPending ? "Creando…" : "Crear cliente"}
          </button>
        </form>
      )}
    </div>
  );
}

export function ClientesB2CClient({ clientes }: { clientes: Cliente[] }) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Cliente</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Teléfono</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Registrado</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Último acceso</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  No hay clientes B2C registrados.
                </td>
              </tr>
            ) : (
              clientes.map((c) => <ClienteRow key={c.id} cliente={c} />)
            )}
          </tbody>
        </table>
      </div>

      <CrearClienteForm />
    </div>
  );
}
