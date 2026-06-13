"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { parsearImport, aplicarImport, type ChangeRow, type ParseResult } from "@/app/(admin)/admin/productos/importar/actions";

const fmt = (n: number) => `$ ${Number(n).toLocaleString("es-AR")}`;

type State = "idle" | "parsing" | "preview" | "applying" | "done";

export function ImportarProductosClient() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [state,    setState]    = useState<State>("idle");
  const [result,   setResult]   = useState<ParseResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileName(f?.name ?? "");
    setResult(null);
    setError(null);
    setState("idle");
  }

  function handleParse() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Seleccioná un archivo CSV."); return; }
    setError(null);
    setState("parsing");

    const fd = new FormData();
    fd.append("archivo", file);

    startTransition(async () => {
      const res = await parsearImport(fd);
      if ("error" in res) {
        setError(res.error);
        setState("idle");
        return;
      }
      setResult(res);
      setState("preview");
    });
  }

  function handleApply() {
    if (!result) return;
    const changes = result.rows
      .filter((r) => r.cambia)
      .map((r) => ({ id: r.id, costo: r.costo_nuevo, pkg_unitario: r.pkg_unitario_nuevo, pkg_bulto: r.pkg_bulto_nuevo }));
    if (!changes.length) return;

    setState("applying");
    startTransition(async () => {
      try {
        await aplicarImport(changes);
        setState("done");
        setTimeout(() => router.push("/admin/productos"), 1500);
      } catch (e: any) {
        setError(e.message ?? "Error al aplicar cambios.");
        setState("preview");
      }
    });
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setFileName("");
    setState("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  const cambios   = result?.rows.filter((r) => r.cambia) ?? [];
  const sinCambio = result?.rows.filter((r) => !r.cambia) ?? [];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Paso 1: Descargar plantilla ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900">1. Descargar plantilla</p>
            <p className="text-xs text-neutral-500 mt-1">
              CSV con todos los productos activos: código, nombre, costo, pkg_unitario, pkg_bulto.
              Editá solo las columnas que cambiaron.
            </p>
          </div>
          <a
            href="/admin/productos/importar/template"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            ↓ Descargar plantilla
          </a>
        </div>
      </div>

      {/* ── Paso 2: Subir CSV ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-neutral-900">2. Subir CSV actualizado</p>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-600 hover:border-tierra-700/40 hover:bg-crema-50 transition-colors">
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {fileName || "Elegir archivo .csv"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {fileName && state === "idle" && (
            <button
              onClick={handleParse}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
            >
              Analizar cambios
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {state === "parsing" && (
          <p className="text-xs text-neutral-400 animate-pulse">Analizando archivo…</p>
        )}
      </div>

      {/* ── Paso 3: Preview ── */}
      {state === "preview" && result && (
        <div className="space-y-4">

          {/* Resumen */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${cambios.length > 0 ? "bg-warning-bg text-warning" : "bg-success-bg text-success"}`}>
              {cambios.length} {cambios.length === 1 ? "cambio" : "cambios"} detectado{cambios.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-neutral-400">
              {sinCambio.length} producto{sinCambio.length !== 1 ? "s" : ""} sin modificación
            </span>
            {result.errores.length > 0 && (
              <span className="text-xs text-danger bg-danger-bg px-2 py-0.5 rounded-lg">
                {result.errores.length} fila{result.errores.length !== 1 ? "s" : ""} con error
              </span>
            )}
          </div>

          {/* Errores de parseo */}
          {result.errores.length > 0 && (
            <div className="bg-danger-bg border border-danger/20 rounded-2xl p-4 space-y-1">
              <p className="text-xs font-semibold text-danger">Filas ignoradas:</p>
              {result.errores.map((e, i) => (
                <p key={i} className="text-xs text-danger/80">{e}</p>
              ))}
            </div>
          )}

          {/* Tabla de cambios */}
          {cambios.length > 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Vista previa de cambios
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-xs text-neutral-400">
                    <th className="px-4 py-2.5 w-14">Cód.</th>
                    <th className="px-4 py-2.5">Producto</th>
                    <th className="px-4 py-2.5 text-right">Costo actual</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-warning">Costo nuevo</th>
                    <th className="px-4 py-2.5 text-right">Pkg unit. actual</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-warning">Pkg unit. nuevo</th>
                    <th className="px-4 py-2.5 text-right">Pkg bulto actual</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-warning">Pkg bulto nuevo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {cambios.map((r) => (
                    <tr key={r.id} className="hover:bg-crema-50 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono text-tierra-700 font-semibold tabular-nums">{r.codigo}</td>
                      <td className="px-4 py-2.5 font-medium text-neutral-900 max-w-xs truncate">{r.nombre}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-400 tabular-nums line-through text-xs">{fmt(r.costo_actual)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-neutral-900">{fmt(r.costo_nuevo)}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-400 tabular-nums line-through text-xs">{r.pkg_unitario_actual > 0 ? fmt(r.pkg_unitario_actual) : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-neutral-900">{r.pkg_unitario_nuevo > 0 ? fmt(r.pkg_unitario_nuevo) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-400 tabular-nums line-through text-xs">{r.pkg_bulto_actual > 0 ? fmt(r.pkg_bulto_actual) : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-neutral-900">{r.pkg_bulto_nuevo > 0 ? fmt(r.pkg_bulto_nuevo) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-success-bg border border-success/20 rounded-2xl px-5 py-4 text-sm text-success">
              No se detectaron cambios. Los precios en el CSV son iguales a los actuales.
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-3">
            {cambios.length > 0 && (
              <button
                onClick={handleApply}
                disabled={isPending}
                className="px-6 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Aplicando…" : `Confirmar ${cambios.length} cambio${cambios.length !== 1 ? "s" : ""}`}
              </button>
            )}
            <button onClick={handleReset} className="px-4 py-2.5 rounded-xl text-sm text-neutral-500 hover:text-neutral-800 transition-colors">
              Cargar otro archivo
            </button>
          </div>
        </div>
      )}

      {state === "done" && (
        <div className="bg-success-bg border border-success/20 rounded-2xl px-5 py-4 text-sm text-success font-medium">
          ✓ Precios actualizados correctamente. Redirigiendo…
        </div>
      )}
    </div>
  );
}
