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

function useUploader(productSku: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleFile(
    file: File,
    onSuccess: (url: string) => void,
    onError: (msg: string) => void,
    onLoading: (v: boolean) => void,
  ) {
    if (!file.type.startsWith("image/")) { onError("Solo imágenes."); return; }
    if (file.size > MAX_SIZE)            { onError("Máx 5 MB."); return; }
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

// ── Slot individual ────────────────────────────────────────────────────────────
function Slot({
  url, isPrincipal, productSku, onSet, onClear, onMakePrincipal,
}: {
  url: string | null;
  isPrincipal: boolean;
  productSku: string;
  onSet: (url: string) => void;
  onClear: () => void;
  onMakePrincipal?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleFile } = useUploader(productSku);

  function onFile(file: File) {
    setError(null);
    handleFile(file, onSet, setError, setUploading);
  }

  if (url) {
    return (
      <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-neutral-200 shrink-0 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="w-full h-full object-cover" />

        {isPrincipal && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-tierra-700 text-white text-[10px] font-semibold leading-none">
            Principal
          </span>
        )}

        {/* Overlay hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
          {!isPrincipal && onMakePrincipal && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMakePrincipal(); }}
              className="px-2 py-1 rounded-lg bg-white/90 text-neutral-800 text-[10px] font-semibold leading-none whitespace-nowrap"
            >
              Principal
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="px-2 py-1 rounded-lg bg-white/90 text-danger text-[10px] font-semibold leading-none"
          >
            Quitar
          </button>
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="w-24 h-24 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-tierra-700/40 hover:bg-crema-50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors shrink-0"
    >
      {uploading ? (
        <span className="text-xs text-neutral-400">Subiendo…</span>
      ) : (
        <>
          <span className="text-2xl text-neutral-300 leading-none font-light">+</span>
          <span className="text-[10px] text-neutral-300 font-medium">Foto</span>
        </>
      )}
      {error && (
        <span className="absolute text-[10px] text-danger text-center px-1">{error}</span>
      )}
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

  const [urlInput, setUrlInput] = useState("");

  function setAt(index: number, url: string) {
    setImages((prev) => prev.map((v, i) => (i === index ? url : v)));
  }

  function clearAt(index: number) {
    setImages((prev) => {
      const next = prev.map((v, i) => (i === index ? null : v));
      const filled = next.filter(Boolean) as string[];
      return [...filled, ...Array(MAX_IMAGES - filled.length).fill(null)];
    });
  }

  function makePrincipal(index: number) {
    setImages((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  // Encontrar el primer slot vacío para el click en el input de URL
  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const firstEmpty = images.findIndex((v) => !v);
    if (firstEmpty === -1) return;
    setAt(firstEmpty, url);
    setUrlInput("");
  }

  const cover  = images[0] ?? "";
  const extras = images.slice(1).filter(Boolean) as string[];
  const sku    = productSku ?? "producto";

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-neutral-500">
        Fotos del producto{" "}
        <span className="font-normal text-neutral-400">(la primera es la principal)</span>
      </label>

      <input type="hidden" name="cover_image_url" value={cover} />
      <input type="hidden" name="extra_images"    value={JSON.stringify(extras)} />

      {/* Fila de slots */}
      <div className="flex items-center gap-2 flex-wrap">
        {images.map((url, i) => (
          <Slot
            key={i}
            url={url}
            isPrincipal={i === 0}
            productSku={sku}
            onSet={(u) => setAt(i, u)}
            onClear={() => clearAt(i)}
            onMakePrincipal={i > 0 ? () => makePrincipal(i) : undefined}
          />
        ))}
      </div>

      {/* Input URL alternativo */}
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
          placeholder="O pegá un link de imagen (https://...)"
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!urlInput.trim() || !images.some((v) => !v)}
          className="px-3 py-2 rounded-xl bg-neutral-100 text-neutral-600 text-sm font-medium hover:bg-neutral-200 disabled:opacity-40 transition-colors"
        >
          +
        </button>
      </div>

      <p className="text-xs text-neutral-400">
        {images.filter(Boolean).length}/{MAX_IMAGES} imágenes · Hover para quitar o marcar como principal
      </p>
    </div>
  );
}
