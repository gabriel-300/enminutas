"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPedidoConFaltante } from "@/app/(admin)/admin/pedidos/actions";

function fechaEn(dias: number) {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function ReprogramarFaltanteButton({
  orderId,
  faltante,
  yaPedido = [],
}: {
  orderId: string;
  faltante: { name: string; cantidad: number }[];
  yaPedido?: { name: string; pedidos: string[] }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(fechaEn(7));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function crear() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await crearPedidoConFaltante(orderId, fecha);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        router.push(`/admin/pedidos/${res.orderId}`);
      } catch (e: any) {
        setError(e?.message ?? "No se pudo crear el pedido");
      }
    });
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-3 px-3 py-2 text-xs font-medium rounded-lg border border-warning-border text-warning hover:bg-white transition-colors"
      >
        Crear pedido con el faltante
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-white border border-neutral-200 p-4 space-y-3">
      <p className="text-xs font-medium text-neutral-700">Se crea un pedido nuevo, aprobado, con:</p>
      <ul className="text-xs text-neutral-600 space-y-0.5">
        {faltante.map((f, i) => (
          <li key={i}>{f.cantidad} × {f.name}</li>
        ))}
      </ul>
      {yaPedido.length > 0 && (
        <div className="rounded-lg bg-warning-bg border border-warning-border px-3 py-2 text-xs text-neutral-700 space-y-0.5">
          <p className="font-medium text-warning">El cliente ya volvió a pedir parte de esto:</p>
          {yaPedido.map((y, i) => (
            <p key={i}>{y.name} → {y.pedidos.join(", ")}</p>
          ))}
          <p className="text-neutral-600">Si ese pedido ya lo cubre, no hace falta reprogramar: crearlo duplicaría la entrega.</p>
        </div>
      )}
      <p className="text-xs text-neutral-600">
        Mismo cliente, zona y forma de pago, con el precio original. No se cobra nada hasta que se despache.
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor={`compromiso-${orderId}`} className="text-xs text-neutral-600">Entregar antes del</label>
        <input
          id={`compromiso-${orderId}`}
          type="date"
          value={fecha}
          min={fechaEn(0)}
          onChange={(e) => setFecha(e.target.value)}
          className="text-sm border border-neutral-200 rounded-lg px-2 py-1"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setAbierto(false)}
          disabled={isPending}
          className="px-3 py-2 text-xs rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={crear}
          disabled={isPending || !fecha}
          className="px-3 py-2 text-xs rounded-lg bg-tierra-700 text-white font-medium hover:bg-tierra-800 disabled:opacity-50"
        >
          {isPending ? "Creando…" : "Crear pedido"}
        </button>
      </div>
    </div>
  );
}
