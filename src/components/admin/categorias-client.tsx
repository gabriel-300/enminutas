"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { crearCategoria, actualizarCategoria, eliminarCategoria } from "@/app/(admin)/admin/categorias/actions";

type Categoria = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  product_count: number;
};

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function CategoriaCard({ cat }: { cat: Categoria }) {
  const supabaseRef  = useRef(createSupabase());
  const [name, setName]           = useState(cat.name);
  const [desc, setDesc]           = useState(cat.description ?? "");
  const [imgUrl, setImgUrl]       = useState(cat.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Solo imágenes."); return; }
    setUploading(true); setError("");
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `categorias/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: e } = await supabaseRef.current.storage
        .from("sitio-web")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (e) throw new Error(e.message);
      const { data } = supabaseRef.current.storage.from("sitio-web").getPublicUrl(path);
      setImgUrl(data.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError("El nombre no puede estar vacío."); return; }
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("description", desc);
      fd.set("image_url", imgUrl);
      await actualizarCategoria(cat.id, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (cat.product_count > 0) {
      alert(`No se puede eliminar: tiene ${cat.product_count} producto${cat.product_count !== 1 ? "s" : ""} asignado${cat.product_count !== 1 ? "s" : ""}.`);
      return;
    }
    if (!confirm(`¿Eliminar "${cat.name}"?`)) return;
    void eliminarCategoria(cat.id);
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Imagen */}
      <div
        className="relative aspect-video w-full flex items-center justify-center cursor-pointer group"
        style={{ background: imgUrl ? undefined : "#EAEBF8" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="text-xs">Subir foto</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">{uploading ? "Subiendo..." : "Cambiar imagen"}</span>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* Campos */}
      <div className="p-4 flex flex-col gap-3">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Nombre</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Descripción (opcional)</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={handleDelete}
            disabled={cat.product_count > 0}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Eliminar
          </button>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600">Guardado ✓</span>}
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-400">{cat.product_count} producto{cat.product_count !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

export function CategoriasClient({ categorias }: { categorias: Categoria[] }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("name", newName.trim());
      await crearCategoria(fd);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Nueva categoría */}
      <form onSubmit={handleCreate} className="flex gap-3 max-w-sm">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nueva categoría…"
          required
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          Agregar
        </button>
      </form>

      {/* Grid de cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categorias.map(c => <CategoriaCard key={c.id} cat={c} />)}
      </div>

      {categorias.length === 0 && (
        <p className="text-sm text-neutral-400">No hay categorías todavía.</p>
      )}
    </div>
  );
}
