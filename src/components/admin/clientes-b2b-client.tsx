"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  aprobarCliente,
  rechazarCliente,
  cambiarEstadoCliente,
  crearClienteB2B,
  invitarClienteB2B,
  editarClienteB2B,
  eliminarClienteB2B,
} from "@/app/(admin)/admin/clientes-b2b/actions";

type Cliente = {
  id:                string;
  full_name:         string | null;
  email:             string | null;
  canal:             string | null;
  b2b_status:        string | null;
  created_at:        string;
  phone:             string | null;
  document_number:   string | null;
  zona_id:           string | null;
  zona:              { name: string } | null;
  vendedor_id:       string | null;
  notas_internas:    string | null;
  direccion_calle:   string | null;
  direccion_numero:  string | null;
  direccion_piso:    string | null;
  direccion_ciudad:  string | null;
};

type Zona      = { id: string; name: string };
type Vendedor  = { id: string; full_name: string };

const CANAL_LABEL: Record<string, string> = {
  dist:   "Distribuidor",
  gastro: "Gastronomía",
  min:    "Minorista",
};

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-warning-bg text-warning",
  activo:    "bg-success-bg text-success",
  inactivo:  "bg-danger-bg text-danger",
};

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

function ClienteRow({ cliente, zonas, vendedores, esAdmin }: { cliente: Cliente; zonas: Zona[]; vendedores: Vendedor[]; esAdmin: boolean }) {
  const [editOpen, setEditOpen]      = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editError, setEditError]    = useState<string | null>(null);
  const status = cliente.b2b_status;

  function handleEdit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError(null);
    const fd = new FormData(e.currentTarget);
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
    startTransition(() => eliminarClienteB2B(cliente.id));
  }

  return (
    <>
      <tr className="hover:bg-neutral-50 transition-colors">
        <td className="px-4 py-3 font-medium text-neutral-900">
          <Link
            href={`/admin/clientes-b2b/${cliente.id}`}
            className="hover:text-tierra-700 hover:underline transition-colors"
          >
            {cliente.full_name ?? "—"}
          </Link>
        </td>
        <td className="px-4 py-3 text-neutral-500 text-xs">{cliente.email ?? "—"}</td>
        <td className="px-4 py-3 text-neutral-600">
          {cliente.canal ? CANAL_LABEL[cliente.canal] ?? cliente.canal : "—"}
        </td>
        <td className="px-4 py-3 text-neutral-600">{cliente.zona?.name ?? "—"}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${STATUS_STYLE[status ?? ""] ?? "bg-neutral-100 text-neutral-500"}`}>
            {status ?? "—"}
          </span>
        </td>
        <td className="px-4 py-3 text-neutral-400 text-xs">
          {new Date(cliente.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {esAdmin && status === "pendiente" && (
              <>
                <button onClick={() => startTransition(() => aprobarCliente(cliente.id))} disabled={isPending} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success text-white hover:opacity-90 disabled:opacity-50">Aprobar</button>
                <button onClick={() => startTransition(() => rechazarCliente(cliente.id))} disabled={isPending} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-danger text-danger hover:bg-danger-bg disabled:opacity-50">Rechazar</button>
              </>
            )}
            {esAdmin && status === "activo" && (
              <button onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "inactivo"))} disabled={isPending} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50">Desactivar</button>
            )}
            {esAdmin && status === "inactivo" && (
              <button onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "activo"))} disabled={isPending} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50">Reactivar</button>
            )}
            <button
              onClick={() => { setEditOpen(!editOpen); setEditError(null); }}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            >
              {editOpen ? "Cancelar" : "Editar"}
            </button>
            {esAdmin && (
              <button
                onClick={handleEliminar}
                disabled={isPending}
                className="px-2 py-1.5 text-xs font-medium rounded-lg border border-danger/30 text-danger hover:bg-danger-bg disabled:opacity-50 transition-colors"
                title="Eliminar cliente"
              >
                ✕
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Fila de edición inline */}
      {editOpen && (
        <tr className="bg-neutral-50 border-b border-neutral-200">
          <td colSpan={7} className="px-4 py-4">
            <form onSubmit={handleEdit} className="space-y-3">
              <input type="hidden" name="id" value={cliente.id} />
              <div className="grid grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre / Empresa</label>
                  <input name="name" defaultValue={cliente.full_name ?? ""} className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 w-full" disabled={isPending} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Canal</label>
                  <select name="canal" defaultValue={cliente.canal ?? ""} className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 bg-white w-full" disabled={isPending}>
                    <option value="">Sin especificar</option>
                    <option value="gastro">Gastronomía</option>
                    <option value="dist">Distribuidor</option>
                    <option value="min">Minorista</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Zona</label>
                  <select name="zona_id" defaultValue={cliente.zona_id ?? ""} className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 bg-white w-full" disabled={isPending}>
                    <option value="">Sin zona</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Vendedor</label>
                  <select name="vendedor_id" defaultValue={cliente.vendedor_id ?? ""} className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 bg-white w-full" disabled={isPending}>
                    <option value="">Sin asignar</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>{v.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Teléfono</label>
                  <input name="phone" defaultValue={cliente.phone ?? ""} placeholder="+54 9 376..." className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 w-full" disabled={isPending} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">CUIT</label>
                  <input name="cuit" defaultValue={cliente.document_number ?? ""} placeholder="20-12345678-9" className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 w-full font-mono" disabled={isPending} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Dirección de entrega</label>
                <div className="grid grid-cols-4 gap-2">
                  <input name="direccion_calle"  defaultValue={cliente.direccion_calle ?? ""}  placeholder="Calle"   className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 col-span-2" disabled={isPending} />
                  <input name="direccion_numero" defaultValue={cliente.direccion_numero ?? ""} placeholder="Número"  className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" disabled={isPending} />
                  <input name="direccion_piso"   defaultValue={cliente.direccion_piso ?? ""}   placeholder="Piso/Dpto (opt.)" className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" disabled={isPending} />
                </div>
                <input name="direccion_ciudad" defaultValue={cliente.direccion_ciudad ?? ""} placeholder="Ciudad / Barrio" className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 w-full mt-2" disabled={isPending} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Notas internas</label>
                <textarea name="notas_internas" defaultValue={cliente.notas_internas ?? ""}
                  rows={2} placeholder="Observaciones internas (no visible al cliente)"
                  className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 w-full resize-none col-span-6"
                  disabled={isPending} />
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50">
                  {isPending ? "Guardando…" : "Guardar"}
                </button>
                {editError && <p className="text-xs text-danger">{editError}</p>}
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function CrearClienteB2BForm({ zonas }: { zonas: Zona[] }) {
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
    if (mode === "password" && pw !== pw2) {
      setError("Las contraseñas no coinciden");
      return;
    }

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
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-neutral-800">Agregar cliente B2B</h2>
        <button
          onClick={() => { setOpen(!open); setError(null); setSuccess(null); }}
          className="text-xs text-tierra-700 hover:underline"
        >
          {open ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {!open && (
        <p className="text-xs text-neutral-400">
          Creá una cuenta B2B directamente o enviá una invitación por email.
        </p>
      )}

      {open && (
        <>
          <div className="flex gap-1 mt-4 mb-5 bg-neutral-100 rounded-lg p-1 w-fit">
            <button type="button" onClick={() => setMode("password")} className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${mode === "password" ? "bg-tierra-700 text-white" : "text-neutral-500 hover:text-neutral-700"}`}>Con contraseña</button>
            <button type="button" onClick={() => setMode("invite")}   className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${mode === "invite"   ? "bg-tierra-700 text-white" : "text-neutral-500 hover:text-neutral-700"}`}>Invitar por email</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre / Empresa</label>
                <input name="name" placeholder="Restaurant El Ejemplo" className={inputCls} disabled={isPending} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Email *</label>
                <input name="email" type="email" required placeholder="cliente@empresa.com" className={inputCls} disabled={isPending} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Teléfono</label>
                <input name="phone" type="tel" placeholder="+54 9 376..." className={inputCls} disabled={isPending} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Canal</label>
                <select name="canal" className={inputCls} disabled={isPending}>
                  <option value="">Sin especificar</option>
                  <option value="gastro">Gastronomía</option>
                  <option value="dist">Distribuidor</option>
                  <option value="min">Minorista</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Zona de delivery</label>
                <select name="zona_id" className={inputCls} disabled={isPending}>
                  <option value="">Sin zona</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">CUIT</label>
                <input name="cuit" placeholder="20-12345678-9" className={`${inputCls} font-mono`} disabled={isPending} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Dirección de entrega</label>
              <div className="grid grid-cols-4 gap-2">
                <input name="direccion_calle"  placeholder="Calle"          className={`${inputCls} col-span-2`} disabled={isPending} />
                <input name="direccion_numero" placeholder="Número"         className={inputCls} disabled={isPending} />
                <input name="direccion_piso"   placeholder="Piso/Dpto"      className={inputCls} disabled={isPending} />
              </div>
              <input name="direccion_ciudad" placeholder="Ciudad / Barrio" className={`${inputCls} mt-2`} disabled={isPending} />
            </div>
            {mode === "password" && (
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
            )}
            {mode === "invite" && (
              <p className="text-xs text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
                Se enviará un email de invitación con un link para que el cliente configure su contraseña.
              </p>
            )}
            {error   && <p className="text-sm text-danger">{error}</p>}
            {success && <p className="text-sm text-success">{success}</p>}
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors">
              {isPending ? (mode === "password" ? "Creando…" : "Enviando…") : (mode === "password" ? "Crear cliente" : "Enviar invitación")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export function ClientesBb2Client({
  clientes,
  pendingCount,
  zonas,
  vendedores = [],
  esAdmin = false,
}: {
  clientes:     Cliente[];
  pendingCount: number;
  zonas:        Zona[];
  vendedores?:  Vendedor[];
  esAdmin?:     boolean;
}) {
  return (
    <div className="space-y-6 max-w-5xl">
      {pendingCount > 0 && (
        <div className="px-4 py-3 bg-warning-bg border border-warning/30 rounded-xl text-sm text-warning font-medium">
          {pendingCount} solicitud{pendingCount !== 1 ? "es" : ""} pendiente{pendingCount !== 1 ? "s" : ""} de aprobación
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Empresa</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Email</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Canal</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Zona</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Estado</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Fecha</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {clientes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                  No hay clientes B2B registrados todavía.
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <ClienteRow key={c.id} cliente={c} zonas={zonas} vendedores={vendedores} esAdmin={esAdmin} />
            ))}
          </tbody>
        </table>
      </div>

      <CrearClienteB2BForm zonas={zonas} />
    </div>
  );
}
