"use client";

import { useState, useTransition } from "react";
import { cambiarRolStaff, revocarAccesoStaff, invitarStaff, crearUsuarioConPassword } from "@/app/(admin)/admin/staff/actions";

type StaffMember = {
  id:           string;
  email:        string;
  name:         string | null;
  role:         string;
  created_at:   string;
  last_sign_in: string | null;
};

const ROLE_OPTIONS = [
  { value: "admin",      label: "Administrador",  desc: "Acceso total" },
  { value: "vendedor",   label: "Vendedor",        desc: "Pedidos, clientes y dashboard" },
  { value: "produccion", label: "Producción",      desc: "Solo vista de producción" },
];

const ROLE_BADGE: Record<string, string> = {
  admin:      "bg-tierra-100 text-tierra-700",
  vendedor:   "bg-info-bg text-info",
  produccion: "bg-success-bg text-success",
};

function StaffRow({
  member,
  isCurrentUser,
}: {
  member: StaffMember;
  isCurrentUser: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(newRole: string) {
    if (newRole === member.role) return;
    startTransition(() => cambiarRolStaff(member.id, newRole as any));
  }

  function handleRevoke() {
    if (!confirm(`¿Revocar acceso de ${member.email}? Ya no podrá ingresar al panel.`)) return;
    startTransition(() => revocarAccesoStaff(member.id));
  }

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-neutral-900">{member.name ?? member.email}</p>
        {member.name && <p className="text-xs text-neutral-400 mt-0.5">{member.email}</p>}
        {isCurrentUser && (
          <span className="text-xs text-neutral-400 italic">Vos</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[member.role] ?? "bg-neutral-100 text-neutral-600"}`}>
          {ROLE_OPTIONS.find((r) => r.value === member.role)?.label ?? member.role}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-neutral-400">
        {member.last_sign_in
          ? new Date(member.last_sign_in).toLocaleDateString("es-AR", {
              day: "2-digit", month: "2-digit", year: "2-digit",
              hour: "2-digit", minute: "2-digit",
            })
          : "Nunca"}
      </td>
      <td className="px-4 py-3">
        {!isCurrentUser ? (
          <div className="flex items-center gap-3">
            <select
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={isPending}
              className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={handleRevoke}
              disabled={isPending}
              className="text-xs text-danger hover:underline disabled:opacity-40"
            >
              Revocar
            </button>
          </div>
        ) : (
          <span className="text-xs text-neutral-300">—</span>
        )}
      </td>
    </tr>
  );
}

function InviteForm() {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode]       = useState<"invite" | "password">("password");
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd   = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        if (mode === "invite") {
          await invitarStaff(fd);
          setSuccess("Invitación enviada. El usuario recibirá un email para activar su cuenta.");
        } else {
          await crearUsuarioConPassword(fd);
          setSuccess("Usuario creado. Ya puede ingresar con su email y contraseña.");
        }
        form.reset();
      } catch (err: any) {
        setError(err.message ?? "Error al crear usuario");
      }
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-neutral-800">Agregar miembro</h2>
        {/* Toggle */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(null); setSuccess(null); }}
            className={`px-3 py-1.5 transition-colors ${mode === "password" ? "bg-tierra-700 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
          >
            Con contraseña
          </button>
          <button
            type="button"
            onClick={() => { setMode("invite"); setError(null); setSuccess(null); }}
            className={`px-3 py-1.5 transition-colors ${mode === "invite" ? "bg-tierra-700 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
          >
            Invitar por email
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-400 mb-4">
        {mode === "password"
          ? "Creá el usuario directamente con una contraseña. No se envía ningún email."
          : "El usuario recibirá un email de invitación para crear su contraseña."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre</label>
            <input name="name" placeholder="Nombre completo" className={inputCls} disabled={isPending} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Email *</label>
            <input name="email" type="email" required placeholder="nombre@empresa.com" className={inputCls} disabled={isPending} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Rol *</label>
            <select name="rol" required className={inputCls} disabled={isPending}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </div>
        </div>

        {mode === "password" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Contraseña *</label>
              <input name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" className={inputCls} disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Confirmar contraseña *</label>
              <input name="password_confirm" type="password" required minLength={8} placeholder="Repetir contraseña" className={inputCls} disabled={isPending} />
            </div>
          </div>
        )}

        {error   && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          {isPending
            ? "Procesando…"
            : mode === "password" ? "Crear usuario" : "Enviar invitación"}
        </button>
      </form>
    </div>
  );
}

export function StaffClient({
  staff,
  currentUserId,
}: {
  staff:         StaffMember[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Tabla de staff */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Miembro</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Rol</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Último acceso</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-neutral-400">
                  No hay miembros de staff configurados.
                </td>
              </tr>
            )}
            {staff.map((m) => (
              <StaffRow
                key={m.id}
                member={m}
                isCurrentUser={m.id === currentUserId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Info de roles */}
      <div className="grid grid-cols-3 gap-3">
        {ROLE_OPTIONS.map((r) => (
          <div key={r.value} className="bg-white rounded-xl border border-neutral-200 p-4">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${ROLE_BADGE[r.value]}`}>
              {r.label}
            </span>
            <p className="text-xs text-neutral-500">{r.desc}</p>
            <ul className="mt-2 text-xs text-neutral-400 space-y-0.5">
              {r.value === "admin" && (
                <>
                  <li>· Dashboard, pedidos, producción</li>
                  <li>· Productos, categorías, zonas</li>
                  <li>· Clientes B2B, staff</li>
                </>
              )}
              {r.value === "vendedor" && (
                <>
                  <li>· Dashboard, pedidos, producción</li>
                  <li>· Clientes B2B</li>
                  <li>· Sin acceso a configuración</li>
                </>
              )}
              {r.value === "produccion" && (
                <>
                  <li>· Solo vista de producción</li>
                  <li>· Dashboard</li>
                  <li>· Sin acceso a pedidos ni clientes</li>
                </>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Formulario de invitación */}
      <InviteForm />
    </div>
  );
}
