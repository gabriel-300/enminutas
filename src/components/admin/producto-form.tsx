"use client";

import { useTransition } from "react";
import { ImageUploader } from "@/components/admin/image-uploader";

type Categoria = { id: string; name: string };

type ProductoValues = {
  sku?: string;
  name?: string;
  unit_label?: string;
  short_description?: string | null;
  description?: string | null;
  cooking_methods?: string | null;
  weight_grams?: number | null;
  price_b2c?: number;
  price_b2b?: number;
  is_active?: boolean;
  category_id?: string | null;
  cover_image_url?:  string | null;
  extra_images?:     string[] | null;
  costo?: number | null;
  kg_caja?: number | null;
  bolsas_caja?: number | null;
  pkg_unitario?: number | null;
  pkg_bulto?: number | null;
  margen_dist?: number | null;
  margen_gastro?: number | null;
  margen_min?: number | null;
  mult_bolsas?: boolean;
};

type Props = {
  categorias: Categoria[];
  defaultValues?: ProductoValues;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
};

function Field({
  label, name, type = "text", defaultValue, placeholder, required, step, min, max,
}: {
  label: string; name: string; type?: string;
  defaultValue?: string | number; placeholder?: string;
  required?: boolean; step?: string; min?: string; max?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        max={max}
        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
      />
    </div>
  );
}

export function ProductoForm({ categorias, defaultValues: dv = {}, action, submitLabel, cancelHref }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Datos básicos */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Datos básicos</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU *" name="sku" defaultValue={dv.sku} placeholder="EMP-PACU-36" required />
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Categoría</label>
            <select
              name="category_id"
              defaultValue={dv.category_id ?? ""}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Field label="Nombre *" name="name" defaultValue={dv.name} placeholder="Empanadas de Pacú" required />

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Descripción corta</label>
          <input
            name="short_description"
            defaultValue={dv.short_description ?? ""}
            placeholder="Una línea para las tarjetas del catálogo"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Descripción completa</label>
          <textarea
            name="description"
            defaultValue={dv.description ?? ""}
            placeholder="Descripción detallada del producto…"
            rows={4}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Métodos de cocción <span className="font-normal text-neutral-400">(uno por línea)</span>
          </label>
          <textarea
            name="cooking_methods"
            defaultValue={dv.cooking_methods ?? ""}
            placeholder={"Horno 180°C · 12 min\nAirfryer · 8 min"}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 resize-none font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Unidad / etiqueta *" name="unit_label" defaultValue={dv.unit_label} placeholder="bolsa x36 u" required />
          <Field label="Peso bruto (g)" name="weight_grams" type="number" defaultValue={dv.weight_grams ?? ""} placeholder="1800" min="0" />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            defaultChecked={dv.is_active ?? true}
            className="size-4 rounded accent-tierra-700"
          />
          <label htmlFor="is_active" className="text-sm text-neutral-700">Producto activo (visible en tienda)</label>
        </div>

        <ImageUploader
          currentUrl={dv.cover_image_url}
          currentExtraImages={dv.extra_images}
          productSku={dv.sku}
        />
      </section>

      {/* Precios B2C */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Precios</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Precio B2C (s/IVA) *" name="price_b2c" type="number" defaultValue={dv.price_b2c} placeholder="0" required min="0" />
          <Field label="Precio B2B fijo (referencia)" name="price_b2b" type="number" defaultValue={dv.price_b2b} placeholder="0" min="0" />
        </div>
      </section>

      {/* Datos B2B */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Datos B2B / Costo</h2>
          <p className="text-xs text-neutral-400 mt-1">Completar para que el catálogo B2B calcule precios dinámicos por canal y zona.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Costo s/IVA por bolsa ($)" name="costo" type="number" defaultValue={dv.costo ?? ""} placeholder="0" step="0.01" min="0" />
          <Field label="Kg por caja" name="kg_caja" type="number" defaultValue={dv.kg_caja ?? ""} placeholder="10.8" step="0.001" min="0" />
          <Field label="Bolsas por caja" name="bolsas_caja" type="number" defaultValue={dv.bolsas_caja ?? ""} placeholder="6" min="1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Packaging unitario ($)" name="pkg_unitario" type="number" defaultValue={dv.pkg_unitario ?? 0} placeholder="0" step="0.01" min="0" />
          <Field label="Packaging por bulto ($)" name="pkg_bulto" type="number" defaultValue={dv.pkg_bulto ?? 0} placeholder="0" step="0.01" min="0" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Margen distribuidor (%)" name="margen_dist" type="number" defaultValue={dv.margen_dist != null ? dv.margen_dist * 100 : 35} placeholder="35" step="0.1" min="0" max="100" />
          <Field label="Margen gastronomía (%)" name="margen_gastro" type="number" defaultValue={dv.margen_gastro != null ? dv.margen_gastro * 100 : 40} placeholder="40" step="0.1" min="0" max="100" />
          <Field label="Margen minorista (%)" name="margen_min" type="number" defaultValue={dv.margen_min != null ? dv.margen_min * 100 : 45} placeholder="45" step="0.1" min="0" max="100" />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="mult_bolsas"
            id="mult_bolsas"
            defaultChecked={dv.mult_bolsas ?? true}
            className="size-4 rounded accent-tierra-700"
          />
          <label htmlFor="mult_bolsas" className="text-sm text-neutral-700">
            Multiplicar costo por bolsas/caja al calcular precio de caja
          </label>
        </div>
      </section>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Guardando…" : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="px-5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
