"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

const MAX_IMAGES = 5;
const MAX_SIZE   = 5 * 1024 * 1024;

async function uploadToStorage(
  supabase: ReturnType<typeof createBrowserClient>,
  file: File,
  productSku: string,
): Promise<string> {
  const ext  = file.name.split(".").pop() ?? "jpg";
  const slug = productSku.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

type Mode = "upload" | "url";

function useUploader(productSku: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleFile(file: File, onSuccess: (url: string) => void, onError: (msg: string) => void, onLoading: (v: boolean) => void) {
    if (!file.type.startsWith("image/")) { onError("Solo imágenes."); return; }
    if (file.size > MAX_SIZE) { onError("Máx 5 MB."); return; }
    onLoading(true);
    try {
      const url = await uploadToStorage(supabase, file, productSku || "producto");
      onSuccess(url);
    } catch {
      onError("Error al subir. Intentá de nuevo.");
    } finally {
      onLoading(false);
    }
  }

  return { handleFile };
}

// ── Slot principal (grande) ────────────────────────────────────────────────────
function MainSlot({
  url, productSku, onSet, onClear,
}: {
  url: string | null; productSku: string;
  onSet: (url: string) => void; onClear: () => void;
}) {
  const [mode, setMode]       = useState<Mode>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleFile } = useUploader(productSku);

  function onFile(file: File) {
    handleFile(file, onSet, setError, setUploading);
  }

  if (url) {
    return (
      <div className="relative group w-52 h-52 rounded-2xl overflow-hidden border border-neutral-200 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Principal" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-3">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-white text-neutral-800 text-xs font-medium">
            Cambiar
          </button>
          <button type="button" onClick={onClear}
            className="px-3 py-1.5 rounded-lg bg-white text-danger text-xs font-medium">
            Quitar
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>
    );
  }

  return (
    <div className="w-52 shrink-0 flex flex-col gap-2">
      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-neutral-200 text-xs self-start">
        {(["upload", "url"] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`px-3 py-1 font-medium transition-colors ${mode === m ? "bg-neutral-800 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50"}`}>
            {m === "upload" ? "Archivo" : "URL"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          className={`w-52 h-52 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragging ? "border-tierra-700 bg-tierra-50" : "border-neutral-200 hover:border-tierra-700/50 hover:bg-neutral-50"
          }`}
        >
          {uploading ? (
            <p className="text-sm text-neutral-400">Subiendo…</p>
          ) : (
            <>
              <svg className="size-10 text-neutral-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 16.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-1.5M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="text-sm text-neutral-500 font-medium">Arrastrá o hacé click</p>
              <p className="text-xs text-neutral-400 mt-0.5">JPG · PNG · WebP · máx 5 MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="w-52 h-52 rounded-2xl border border-neutral-200 flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-xs text-neutral-400 text-center">Pegá la URL de la imagen</p>
          <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (urlInput.trim()) { onSet(urlInput.trim()); setUrlInput(""); } } }}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
          <button type="button" onClick={() => { if (urlInput.trim()) { onSet(urlInput.trim()); setUrlInput(""); } }}
            disabled={!urlInput.trim()}
            className="w-full py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-40 transition-colors">
            Confirmar
          </button>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ── Miniatura adicional (pequeña) ──────────────────────────────────────────────
function ThumbSlot({
  url, index, productSku, onSet, onClear,
}: {
  url: string | null; index: number; productSku: string;
  onSet: (url: string) => void; onClear: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleFile } = useUploader(productSku);

  function onFile(file: File) {
    handleFile(file, onSet, setError, setUploading);
  }

  if (url) {
    return (
      <div className="relative group w-14 h-14 rounded-xl overflow-hidden border border-neutral-200 cursor-pointer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Imagen ${index + 2}`} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button type="button" onClick={onClear}
            className="text-white text-xs font-bold">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="w-14 h-14 rounded-xl border-2 border-dashed border-neutral-200 hover:border-tierra-700/40 hover:bg-neutral-50 flex items-center justify-center cursor-pointer transition-colors"
    >
      {uploading ? (
        <span className="text-xs text-neutral-400">…</span>
      ) : (
        <span className="text-2xl text-neutral-300 leading-none">+</span>
      )}
      {error && <span title={error} className="absolute text-danger text-xs">!</span>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function ImageUploader({
  currentUrl,
  currentExtraImages,
  productSku,
}: {
  currentUrl?:         string | null;
  currentExtraImages?: string[] | null;
  productSku?:         string;
}) {
  const [images, setImages] = useState<(string | null)[]>(() => {
    const all: (string | null)[] = [
      currentUrl ?? null,
      ...((currentExtraImages ?? []).slice(0, MAX_IMAGES - 1)),
    ];
    while (all.length < MAX_IMAGES) all.push(null);
    return all.slice(0, MAX_IMAGES);
  });

  function setAt(index: number, url: string) {
    setImages((prev) => prev.map((v, i) => (i === index ? url : v)));
  }

  function clearAt(index: number) {
    setImages((prev) => {
      const next = prev.map((v, i) => (i === index ? null : v));
      // Compactar: los nulos flotan al final
      const filled = next.filter(Boolean) as string[];
      return [...filled, ...Array(MAX_IMAGES - filled.length).fill(null)];
    });
  }

  const cover  = images[0] ?? "";
  const extras = images.slice(1).filter(Boolean) as string[];

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 mb-3">
        Imágenes <span className="font-normal text-neutral-400">(hasta {MAX_IMAGES} · la primera es la principal)</span>
      </label>

      <input type="hidden" name="cover_image_url" value={cover} />
      <input type="hidden" name="extra_images"    value={JSON.stringify(extras)} />

      <div className="flex items-start gap-4">
        {/* Slot principal */}
        <MainSlot
          url={images[0]}
          productSku={productSku ?? "producto"}
          onSet={(url) => setAt(0, url)}
          onClear={() => clearAt(0)}
        />

        {/* Miniaturas adicionales */}
        <div className="flex flex-col gap-2 pt-8">
          <p className="text-xs text-neutral-400 mb-1">Adicionales</p>
          <div className="flex flex-col gap-2">
            {images.slice(1).map((url, i) => (
              <ThumbSlot
                key={i}
                index={i}
                url={url}
                productSku={productSku ?? "producto"}
                onSet={(u) => setAt(i + 1, u)}
                onClear={() => clearAt(i + 1)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
