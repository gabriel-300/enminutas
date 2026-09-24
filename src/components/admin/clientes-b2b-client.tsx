"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  aprobarCliente,
  rechazarCliente,
  cambiarEstadoCliente,
  crearClienteB2B,
  invitarClienteB2B,
  editarClienteB2B,
  eliminarClienteB2B,
  enviarResetPassword,
  setPasswordCliente,
  cambiarEmailCliente,
} from "@/app/(admin)/admin/clientes-b2b/actions";
import { Pencil, Trash2 } from "lucide-react";
import { Button, IconButton, StatusBadge, type Tone } from "@/components/ui";

type Cliente = {
  id:                  string;
  full_name:           string | null;
  email:               string | null;
  canal_id:            string | null;
  canal_nombre:        string | null;
  descuento_extra_pct: number;
  b2b_status:          string | null;
  created_at:          string;
  phone:               string | null;
  document_number:     string | null;
  zona_id:             string | null;
  zona:                { name: string } | null;
  vendedor_id:         string | null;
  notas_internas:      string | null;
  direccion_calle:     string | null;
  direccion_numero:    string | null;
  direccion_piso:      string | null;
  direccion_ciudad:    string | null;
};

type Zona     = { id: string; name: string };
type Vendedor = { id: string; full_name: string };
type Canal    = { id: string; slug: string; nombre: string; descuento_pct: number };

const STATUS_TONE: Record<string, Tone> = {
  pendiente: "warning",
  activo:    "success",
  inactivo:  "neutral",
};

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50";

// ── Shared edit form ──────────────────────────────────────────────────────────

function EditForm({
  cliente, zonas, canales, vendedores, esAdmin, isPending, editError, onSubmit,
}: {
  cliente: Cliente; zonas: Zona[]; canales: Canal[]; vendedores: Vendedor[];
  esAdmin: boolean; isPending: boolean; editError: string | null;
  onSubmit: (fd: FormData) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleSubmit() {
    if (!ref.current) return;
    const fd = new FormData();
    ref.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea").forEach(el => {
      if (el.name) fd.set(el.name, el.value);
    });
    onSubmit(fd);
  }

  return (
    <div ref={ref} className="space-y-3">
      <input type="hidden" name="id" value={cliente.id} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Nombre / Empresa</label>
          <input name="name" defaultValue={cliente.full_name ?? ""} className={inputCls} disabled={isPending} />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Canal</label>
          <select name="canal_id" defaultValue={cliente.canal_id ?? ""} className={`${inputCls} bg-white`} disabled={isPending}>
            <option value="">Sin especificar</option>
            {canales.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Zona</label>
          <select name="zona_id" defaultValue={cliente.zona_id ?? ""} className={`${inputCls} bg-white`} disabled={isPending}>
            <option value="">Sin zona</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Vendedor</label>
          <select name="vendedor_id" defaultValue={cliente.vendedor_id ?? ""} className={`${inputCls} bg-white`} disabled={isPending}>
            <option value="">Sin asignar</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Teléfono</label>
          <input name="phone" defaultValue={cliente.phone ?? ""} placeholder="+54 9 376…" className={inputCls} disabled={isPending} />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">CUIT</label>
          <input name="cuit" defaultValue={cliente.document_number ?? ""} placeholder="20-12345678-9" className={`${inputCls} font-mono`} disabled={isPending} />
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600">
        Las direcciones de entrega se gestionan desde el perfil del cliente.
        <a href={`/admin/clientes-b2b/${cliente.id}`} className="text-tierra-700 hover:underline shrink-0">Ver →</a>
      </div>
      <div>
        <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Notas internas</label>
        <textarea name="notas_internas" defaultValue={cliente.notas_internas ?? ""}
          rows={2} placeholder="Observaciones internas (no visible al cliente)"
          className={`${inputCls} resize-none`} disabled={isPending} />
      </div>
      {esAdmin && (
        <div className="flex items-center gap-4 px-3 py-2 bg-warning-bg border border-warning-border rounded-xl">
          <div>
            <label className="block text-xs font-medium text-warning mb-1">Descuento extra (%)</label>
            <input name="descuento_extra_pct" type="number"
              defaultValue={cliente.descuento_extra_pct ?? 0}
              min="0" max="99" step="0.01"
              className="w-24 px-3 py-1.5 text-sm border border-warning-border rounded-lg focus:outline-none focus:ring-2 focus:ring-warning-border"
              disabled={isPending} />
          </div>
          <p className="text-xs text-warning">Solo admin. Se acumula sobre el descuento del canal.</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSubmit} disabled={isPending}
          className="px-4 py-2 rounded-lg bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50">
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        {editError && <p className="text-xs text-danger">{editError}</p>}
      </div>
    </div>
  );
}

// ── Email panel (inline, below the edit form) ────────────────────────────────

function EmailPanel({ clienteId, emailActual }: { clienteId: string; emailActual: string | null }) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail]     = useState("");
  const [msg, setMsg]         = useState<string | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  function handleSave() {
    setErr(null); setMsg(null);
    start(async () => {
      try {
        const res = await cambiarEmailCliente(clienteId, email);
        if (res.error) setErr(res.error);
        else { setMsg("Email actualizado. El cliente ya debe ingresar con el nuevo."); setEditing(false); setEmail(""); }
      } catch (e: any) {
        setErr(e?.message ?? "Error inesperado");
      }
    });
  }

  return (
    <div className="mt-3 px-3 py-3 border border-neutral-200 rounded-xl bg-neutral-50 space-y-2">
      <p className="text-xs font-medium text-neutral-600">Email de acceso</p>
      {!editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-700">{emailActual ?? "—"}</span>
          <button type="button" onClick={() => { setEditing(true); setEmail(emailActual ?? ""); setMsg(null); setErr(null); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100">
            Cambiar email
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="nuevo@email.com"
            className="flex-1 px-3 py-1.5 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700"
            disabled={isPending}
          />
          <button type="button" onClick={handleSave} disabled={isPending || !email.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50">
            {isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => { setEditing(false); setErr(null); }} disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
        </div>
      )}
      {msg && <p className="text-xs text-success">{msg}</p>}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}

// ── Password panel (inline, below the edit form) ─────────────────────────────

function PasswordPanel({ clienteId }: { clienteId: string }) {
  const [mode, setMode]       = useState<"idle" | "set" | "sent">("idle");
  const [pwd, setPwd]         = useState("");
  const [msg, setMsg]         = useState<string | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  function handleSend() {
    setErr(null); setMsg(null);
    start(async () => {
      try {
        const res = await enviarResetPassword(clienteId);
        if (res.error) setErr(res.error);
        else { setMsg("Link de recuperación enviado al email del cliente."); setMode("sent"); }
      } catch (e: any) {
        setErr(e?.message ?? "Error inesperado");
      }
    });
  }

  function handleSet() {
    setErr(null); setMsg(null);
    start(async () => {
      try {
        const res = await setPasswordCliente(clienteId, pwd);
        if (res.error) setErr(res.error);
        else { setMsg("Contraseña actualizada."); setPwd(""); setMode("idle"); }
      } catch (e: any) {
        setErr(e?.message ?? "Error inesperado");
      }
    });
  }

  return (
    <div className="mt-3 px-3 py-3 border border-neutral-200 rounded-xl bg-neutral-50 space-y-2">
      <p className="text-xs font-medium text-neutral-600">Contraseña de acceso</p>
      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setMode("set"); setMsg(null); setErr(null); }} disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50">
            Establecer contraseña
          </button>
          <button type="button" onClick={handleSend} disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
            {isPending ? "Enviando…" : "Enviar link de recuperación"}
          </button>
        </div>
      )}
      {mode === "set" && (
        <div className="flex items-center gap-2">
          <input
            type="password" value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            className="flex-1 px-3 py-1.5 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700"
            disabled={isPending}
          />
          <button type="button" onClick={handleSet} disabled={isPending || pwd.length < 8}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50">
            {isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => { setMode("idle"); setPwd(""); setErr(null); }} disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
        </div>
      )}
      {msg && <p className="text-xs text-success">{msg}</p>}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function ClienteMobileCard({ cliente, zonas, vendedores, canales, esAdmin }: {
  cliente: Cliente; zonas: Zona[]; vendedores: Vendedor[]; canales: Canal[]; esAdmin: boolean;
}) {
  const [editOpen, setEditOpen]      = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editError, setEditError]    = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const status = cliente.b2b_status;

  function handleEdit(fd: FormData) {
    setEditError(null);
    startTransition(async () => {
      try {
        await editarClienteB2B(fd);
        setEditOpen(false);
      } catch (err: any) {
        setEditError(err.message ?? "Error al guardar");
      }
    });
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar al cliente ${cliente.full_name ?? cliente.email}?`)) return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        await eliminarClienteB2B(cliente.id);
      } catch (err: any) {
        setDeleteError(err.message ?? "Error al eliminar");
      }
    });
  }

  const phoneClean = cliente.phone?.replace(/\s/g, "") ?? "";

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
      {/* Nombre + estado */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <Link href={`/admin/clientes-b2b/${cliente.id}`}
          className="font-medium text-neutral-900 hover:text-tierra-700 transition-colors">
          {cliente.full_name ?? "—"}
        </Link>
        <StatusBadge tone={STATUS_TONE[status ?? ""] ?? "neutral"} className="shrink-0 capitalize">{status ?? "—"}</StatusBadge>
      </div>

      {/* Info secundaria */}
      <div className="text-xs text-neutral-600 space-y-0.5 mb-3">
        {cliente.email && <p>{cliente.email}</p>}
        <p className="flex items-center gap-2">
          {cliente.canal_nombre && <span>{cliente.canal_nombre}</span>}
          {cliente.descuento_extra_pct > 0 && <span className="text-success font-medium">+{cliente.descuento_extra_pct}%</span>}
          {cliente.zona && <span>· {cliente.zona.name}</span>}
        </p>
        {cliente.phone && (
          <a href={`tel:${phoneClean}`} className="text-tierra-700 hover:underline">{cliente.phone}</a>
        )}
        <p>{new Date(cliente.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</p>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        {esAdmin && status === "pendiente" && (
          <>
            <Button size="sm" onClick={() => startTransition(() => aprobarCliente(cliente.id))} disabled={isPending} className="flex-1">
              Aprobar
            </Button>
            <Button size="sm" variant="danger-soft" onClick={() => startTransition(() => rechazarCliente(cliente.id))} disabled={isPending}>
              Rechazar
            </Button>
          </>
        )}
        {esAdmin && status === "activo" && (
          <Button size="sm" variant="secondary" onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "inactivo"))} disabled={isPending}>
            Desactivar
          </Button>
        )}
        {esAdmin && status === "inactivo" && (
          <Button size="sm" variant="secondary" onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "activo"))} disabled={isPending}>
            Reactivar
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => { setEditOpen(!editOpen); setEditError(null); }} disabled={isPending}>
          {!editOpen && <Pencil />}{editOpen ? "Cancelar" : "Editar"}
        </Button>
        {esAdmin && (
          <IconButton label="Eliminar cliente" variant="danger-soft" onClick={handleEliminar} disabled={isPending}>
            <Trash2 />
          </IconButton>
        )}
      </div>

      {deleteError && <p className="text-xs text-danger mt-2">{deleteError}</p>}

      {/* Edit form */}
      {editOpen && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <EditForm cliente={cliente} zonas={zonas} canales={canales} vendedores={vendedores}
            esAdmin={esAdmin} isPending={isPending} editError={editError} onSubmit={handleEdit} />
          {esAdmin && <EmailPanel clienteId={cliente.id} emailActual={cliente.email} />}
          {esAdmin && <PasswordPanel clienteId={cliente.id} />}
        </div>
      )}
    </div>
  );
}

// ── Desktop row ───────────────────────────────────────────────────────────────

function ClienteRow({ cliente, zonas, vendedores, canales, esAdmin }: {
  cliente: Cliente; zonas: Zona[]; vendedores: Vendedor[]; canales: Canal[]; esAdmin: boolean;
}) {
  const [editOpen, setEditOpen]      = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editError, setEditError]    = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const status = cliente.b2b_status;

  function handleEdit(fd: FormData) {
    setEditError(null);
    startTransition(async () => {
      try {
        await editarClienteB2B(fd);
        setEditOpen(false);
      } catch (err: any) {
        setEditError(err.message ?? "Error al guardar");
      }
    });
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar al cliente ${cliente.full_name ?? cliente.email}? Esta acción no se puede deshacer.`)) return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        await eliminarClienteB2B(cliente.id);
      } catch (err: any) {
        setDeleteError(err.message ?? "Error al eliminar");
      }
    });
  }

  return (
    <>
      <tr className="hover:bg-neutral-50 transition-colors">
        <td className="px-4 py-3 font-medium text-neutral-900">
          <Link href={`/admin/clientes-b2b/${cliente.id}`}
            className="hover:text-tierra-700 hover:underline transition-colors">
            {cliente.full_name ?? "—"}
          </Link>
        </td>
        <td className="px-4 py-3 text-neutral-600 text-xs">{cliente.email ?? "—"}</td>
        <td className="px-4 py-3 text-neutral-600">
          {cliente.canal_nombre ?? "—"}
          {cliente.descuento_extra_pct > 0 && (
            <span className="ml-1 text-xs text-success font-medium">+{cliente.descuento_extra_pct}%</span>
          )}
        </td>
        <td className="px-4 py-3 text-neutral-600">{cliente.zona?.name ?? "—"}</td>
        <td className="px-4 py-3">
          <StatusBadge tone={STATUS_TONE[status ?? ""] ?? "neutral"} className="capitalize">{status ?? "—"}</StatusBadge>
        </td>
        <td className="px-4 py-3 text-neutral-600 text-xs">
          {new Date(cliente.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {esAdmin && status === "pendiente" && (
              <>
                <Button size="sm" onClick={() => startTransition(() => aprobarCliente(cliente.id))} disabled={isPending}>Aprobar</Button>
                <Button size="sm" variant="danger-soft" onClick={() => startTransition(() => rechazarCliente(cliente.id))} disabled={isPending}>Rechazar</Button>
              </>
            )}
            {esAdmin && status === "activo" && (
              <Button size="sm" variant="secondary" onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "inactivo"))} disabled={isPending}>Desactivar</Button>
            )}
            {esAdmin && status === "inactivo" && (
              <Button size="sm" variant="secondary" onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "activo"))} disabled={isPending}>Reactivar</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => { setEditOpen(!editOpen); setEditError(null); }} disabled={isPending}>
              {!editOpen && <Pencil />}{editOpen ? "Cancelar" : "Editar"}
            </Button>
            {esAdmin && (
              <IconButton label="Eliminar cliente" variant="danger-soft" onClick={handleEliminar} disabled={isPending}>
                <Trash2 />
              </IconButton>
            )}
          </div>
        </td>
      </tr>

      {deleteError && (
        <tr className="bg-danger-bg/30">
          <td colSpan={7} className="px-4 py-2 text-xs text-danger">{deleteError}</td>
        </tr>
      )}

      {editOpen && (
        <>
          <tr className="bg-neutral-50">
            <td colSpan={7} className="px-4 pt-4 pb-2">
              <EditForm cliente={cliente} zonas={zonas} canales={canales} vendedores={vendedores}
                esAdmin={esAdmin} isPending={isPending} editError={editError} onSubmit={handleEdit} />
            </td>
          </tr>
          {esAdmin && (
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <td colSpan={7} className="px-4 pb-4 pt-0">
                <EmailPanel clienteId={cliente.id} emailActual={cliente.email} />
                <PasswordPanel clienteId={cliente.id} />
              </td>
            </tr>
          )}
        </>
      )}
    </>
  );
}

// ── Crear cliente form ────────────────────────────────────────────────────────

function CrearClienteB2BForm({ zonas, canales }: { zonas: Zona[]; canales: Canal[] }) {
  const [isPending, startTransition] = useTransition();
  const [open,    setOpen]    = useState(false);
  const [mode,    setMode]    = useState<"password" | "invite">("password");
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd   = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null); setSuccess(null);

    const pw  = fd.get("password") as string;
    const pw2 = fd.get("password_confirm") as string;
    if (mode === "password" && pw !== pw2) { setError("Las contraseñas no coinciden"); return; }

    startTransition(async () => {
      const result = mode === "password"
        ? await crearClienteB2B(fd)
        : await invitarClienteB2B(fd);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(mode === "password" ? "Cliente B2B creado correctamente." : "Invitación enviada al email del cliente.");
        form.reset();
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-neutral-800">Agregar cliente B2B</h2>
        <button onClick={() => { setOpen(!open); setError(null); setSuccess(null); }}
          className="text-xs text-tierra-700 hover:underline">
          {open ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {!open && (
        <p className="text-xs text-neutral-600">
          Creá una cuenta B2B directamente o enviá una invitación por email.
        </p>
      )}

      {open && (
        <>
          <div className="flex gap-1 mt-4 mb-5 bg-neutral-100 rounded-lg p-1 w-fit">
            <button type="button" onClick={() => setMode("password")}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${mode === "password" ? "bg-tierra-700 text-white" : "text-neutral-600 hover:text-neutral-700"}`}>
              Con contraseña
            </button>
            <button type="button" onClick={() => setMode("invite")}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${mode === "invite" ? "bg-tierra-700 text-white" : "text-neutral-600 hover:text-neutral-700"}`}>
              Invitar por email
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Nombre / Empresa</label>
                <input name="name" placeholder="Restaurant El Ejemplo" className={inputCls} disabled={isPending} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Email *</label>
                <input name="email" type="email" required placeholder="cliente@empresa.com" className={inputCls} disabled={isPending} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Teléfono</label>
                <input name="phone" type="tel" placeholder="+54 9 376…" className={inputCls} disabled={isPending} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Canal</label>
                <select name="canal_id" className={`${inputCls} bg-white`} disabled={isPending}>
                  <option value="">Sin especificar</option>
                  {canales.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Zona de delivery</label>
                <select name="zona_id" className={`${inputCls} bg-white`} disabled={isPending}>
                  <option value="">Sin zona</option>
                  {zonas.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">CUIT</label>
                <input name="cuit" placeholder="20-12345678-9" className={`${inputCls} font-mono`} disabled={isPending} />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Dirección fiscal</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input name="direccion_calle"  placeholder="Calle"     className={`${inputCls} col-span-2`} disabled={isPending} />
                <input name="direccion_numero" placeholder="Número"    className={inputCls} disabled={isPending} />
                <input name="direccion_piso"   placeholder="Piso/Dpto" className={inputCls} disabled={isPending} />
              </div>
              <input name="direccion_ciudad" placeholder="Ciudad / Barrio" className={`${inputCls} mt-2`} disabled={isPending} />
            </div>
            {mode === "password" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Contraseña *</label>
                  <input name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" className={inputCls} disabled={isPending} />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Confirmar *</label>
                  <input name="password_confirm" type="password" required minLength={8} placeholder="Repetir" className={inputCls} disabled={isPending} />
                </div>
              </div>
            )}
            {mode === "invite" && (
              <p className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
                Se enviará un email de invitación con un link para que el cliente configure su contraseña.
              </p>
            )}
            {error   && <p className="text-sm text-danger">{error}</p>}
            {success && <p className="text-sm text-success">{success}</p>}
            <button type="submit" disabled={isPending}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors">
              {isPending
                ? (mode === "password" ? "Creando…" : "Enviando…")
                : (mode === "password" ? "Crear cliente" : "Enviar invitación")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientesBb2Client({
  clientes, pendingCount, zonas, canales = [], vendedores = [], esAdmin = false, esVendedor = false,
}: {
  clientes:     Cliente[];
  pendingCount: number;
  zonas:        Zona[];
  canales?:     Canal[];
  vendedores?:  Vendedor[];
  esAdmin?:     boolean;
  esVendedor?:  boolean;
}) {
  const [query, setQuery] = useState("");

  const filtrados = query.trim()
    ? clientes.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.canal_nombre?.toLowerCase().includes(q) ||
          c.zona?.name?.toLowerCase().includes(q)
        );
      })
    : clientes;

  return (
    <div className="space-y-5 md:space-y-6">
      {pendingCount > 0 && (
        <div className="px-4 py-3 bg-warning-bg border border-warning-border rounded-xl text-sm text-warning font-medium">
          {pendingCount} solicitud{pendingCount !== 1 ? "es" : ""} pendiente{pendingCount !== 1 ? "s" : ""} de aprobación
        </div>
      )}

      {(esAdmin || esVendedor) && <CrearClienteB2BForm zonas={zonas} canales={canales} />}

      {/* ── Buscador ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, email, canal o zona…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-neutral-400 rounded-lg bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-600 text-lg leading-none">×</button>
        )}
      </div>

      {query && (
        <p className="text-xs text-neutral-600 -mt-3">
          {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
        </p>
      )}

      {/* ── Mobile: cards ────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filtrados.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-10">
            {query ? "Sin resultados para esa búsqueda." : "No hay clientes B2B registrados todavía."}
          </p>
        ) : (
          filtrados.map((c) => (
            <ClienteMobileCard key={c.id} cliente={c} zonas={zonas} canales={canales}
              vendedores={vendedores} esAdmin={esAdmin} />
          ))
        )}
      </div>

      {/* ── Desktop: tabla ───────────────────────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Empresa</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Email</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Canal</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Zona</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Estado</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Fecha</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-600">
                  {query ? "Sin resultados para esa búsqueda." : "No hay clientes B2B registrados todavía."}
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <ClienteRow key={c.id} cliente={c} zonas={zonas} canales={canales}
                vendedores={vendedores} esAdmin={esAdmin} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
