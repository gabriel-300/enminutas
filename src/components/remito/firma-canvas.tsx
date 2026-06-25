"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import { guardarFirma } from "@/app/remito/[id]/actions";
import { RotateCcw, Check } from "lucide-react";

export function FirmaCanvas({ orderId }: { orderId: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [dibujo, setDibujo]       = useState(false);
  const [tieneTrazo, setTieneTrazo] = useState(false);
  const [aclaracion, setAclaracion] = useState("");
  const [pending, start]            = useTransition();
  const [error, setError]           = useState<string | null>(null);
  const [guardado, setGuardado]     = useState(false);

  const isDrawing = useRef(false);
  const lastPos   = useRef<{ x: number; y: number } | null>(null);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    isDrawing.current = true;
    lastPos.current   = getPos(e, canvas);
    setDibujo(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.stroke();
    }
    lastPos.current = pos;
    setTieneTrazo(true);
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDrawing.current = false;
    lastPos.current   = null;
  }

  function limpiar() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneTrazo(false); setDibujo(false); setError(null);
  }

  function confirmar() {
    const canvas = canvasRef.current; if (!canvas) return;
    if (!tieneTrazo) { setError("Por favor, firmá en el recuadro antes de confirmar."); return; }
    const firmaData = canvas.toDataURL("image/png");
    setError(null);
    start(async () => {
      const res = await guardarFirma(orderId, firmaData, aclaracion);
      if (res.error) { setError(res.error); return; }
      setGuardado(true);
    });
  }

  if (guardado) {
    return (
      <div className="no-print mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <Check className="size-5 text-emerald-600 shrink-0" />
        <p className="text-sm font-medium text-emerald-800">Firma guardada correctamente. Recargá la página para verla en el remito.</p>
      </div>
    );
  }

  return (
    <div className="no-print mt-6 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-800">Firma digital del receptor</p>
        <button
          onClick={limpiar}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <RotateCcw className="size-3.5" /> Limpiar
        </button>
      </div>

      <div className="p-3">
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          className="w-full rounded-xl border border-dashed border-neutral-300 touch-none cursor-crosshair bg-neutral-50"
          style={{ display: "block" }}
        />
        {!dibujo && !tieneTrazo && (
          <p className="text-xs text-center text-neutral-400 -mt-10 pointer-events-none select-none">
            Firmá aquí
          </p>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        <input
          type="text"
          value={aclaracion}
          onChange={e => setAclaracion(e.target.value)}
          placeholder="Aclaración (nombre del firmante, opcional)"
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={confirmar}
          disabled={pending || !tieneTrazo}
          className="w-full py-2.5 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-40"
        >
          {pending ? "Guardando..." : "Confirmar firma"}
        </button>
      </div>
    </div>
  );
}
