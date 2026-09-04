"use client";

import { useState, useRef, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { guardarSeccion } from "./actions";

type Campo = {
  clave: string;
  seccion: string;
  etiqueta: string;
  tipo: string;
  valor: string | null;
  actualizado_en: string | null;
};

const SECCION_LABEL: Record<string, string> = {
  hero:               "Hero — Portada",
  nosotros:           "Quiénes somos",
  producto_destacado: "Producto destacado",
  contacto:           "Contacto y redes",
};

function useSupabase() {
  const ref = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  if (!ref.current) {
    ref.current = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return ref.current;
}

function ImageUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string) => void;
}) {
  const supabase = useSupabase();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Solo imágenes."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Máximo 8 MB."); return; }
    setError(null);
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("sitio-web")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("sitio-web").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {value && (
        <div className="relative w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full rounded-lg object-cover" style={{ maxHeight: 180 }} />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 size-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors p-6"
        style={{ borderColor: "#2a3f5c", background: "#131e2f" }}
      >
        {uploading ? (
          <p className="text-sm" style={{ color: "#5a7a9e" }}>Subiendo...</p>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7a9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="text-xs" style={{ color: "#5a7a9e" }}>
              {value ? "Reemplazar imagen" : "Subir imagen"} · click o arrastrar
            </p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {value && (
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 text-xs rounded-lg px-3 py-2 border"
            style={{ background: "#131e2f", borderColor: "#2a3f5c", color: "#7a9ab8" }}
            placeholder="URL de la imagen"
          />
        </div>
      )}
      {!value && (
        <input
          value=""
          onChange={e => { if (e.target.value) onChange(e.target.value); }}
          className="text-xs rounded-lg px-3 py-2 border w-full"
          style={{ background: "#131e2f", borderColor: "#2a3f5c", color: "#7a9ab8" }}
          placeholder="O pegar URL directamente"
        />
      )}
    </div>
  );
}

function SeccionCard({ seccion, campos }: { seccion: string; campos: Campo[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map(c => [c.clave, c.valor ?? ""]))
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(clave: string, val: string) {
    setValues(prev => ({ ...prev, [clave]: val }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await guardarSeccion(
          Object.entries(values).map(([clave, valor]) => ({ clave, valor }))
        );
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#141c2e", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <h2 className="text-sm font-semibold text-white">
          {SECCION_LABEL[seccion] ?? seccion}
        </h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs" style={{ color: "#22d3a0" }}>Guardado ✓</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: "#0db4c3", color: "#fff" }}
          >
            {isPending ? "Guardando..." : "Guardar sección"}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        {campos.map(campo => (
          <div key={campo.clave}>
            <label className="block text-xs font-medium mb-2" style={{ color: "#7a9ab8" }}>
              {campo.etiqueta}
            </label>

            {campo.tipo === "imagen" ? (
              <ImageUploader
                value={values[campo.clave] || null}
                onChange={val => handleChange(campo.clave, val)}
              />
            ) : campo.tipo === "textarea" ? (
              <textarea
                value={values[campo.clave]}
                onChange={e => handleChange(campo.clave, e.target.value)}
                rows={3}
                className="w-full text-sm rounded-xl px-4 py-3 border resize-none focus:outline-none"
                style={{ background: "#0f1623", borderColor: "#2a3f5c", color: "#ccd9e8" }}
              />
            ) : (
              <input
                type="text"
                value={values[campo.clave]}
                onChange={e => handleChange(campo.clave, e.target.value)}
                className="w-full text-sm rounded-xl px-4 py-3 border focus:outline-none"
                style={{ background: "#0f1623", borderColor: "#2a3f5c", color: "#ccd9e8" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContenidoClient({ contenido }: { contenido: Campo[] }) {
  const porSeccion = contenido.reduce<Record<string, Campo[]>>((acc, c) => {
    (acc[c.seccion] ??= []).push(c);
    return acc;
  }, {});

  const ordenSecciones = ["hero", "nosotros", "producto_destacado", "contacto"];

  const secciones = [
    ...ordenSecciones.filter(s => porSeccion[s]),
    ...Object.keys(porSeccion).filter(s => !ordenSecciones.includes(s)),
  ];

  return (
    <div className="flex flex-col gap-6">
      {secciones.map(sec => (
        <SeccionCard key={sec} seccion={sec} campos={porSeccion[sec]} />
      ))}
    </div>
  );
}
