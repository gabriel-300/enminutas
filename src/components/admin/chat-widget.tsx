"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Qué pedidos están esperando producción?",
  "¿Cuánto sale la pizza Margarita para distribuidor?",
  "¿Para qué sirve el módulo de Muestras?",
  "¿Cómo registro stock de un lote de producción?",
];

export function ChatWidget() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState<Msg[]>([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  // Focus en input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function send(text = input) {
    const q = text.trim();
    if (!q || loading) return;

    const history: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const text = await res.text();
      let data: { reply?: string; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: `Error ${res.status}: respuesta inválida del servidor.` };
      }
      setMsgs([...history, { role: "assistant", content: data.reply ?? data.error ?? "Error inesperado." }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error de red";
      setMsgs([...history, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden">

      {/* Panel de chat */}
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden"
          style={{ maxHeight: "min(500px, calc(100vh - 120px))" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-tierra-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm font-semibold">Asistente En Minutas</span>
            </div>
            <div className="flex items-center gap-2">
              {msgs.length > 0 && (
                <button onClick={() => setMsgs([])}
                  className="text-xs text-white/60 hover:text-white transition-colors">
                  Limpiar
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {msgs.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-neutral-500 text-center mb-3">
                  Podés preguntarme sobre precios, pedidos o el estado de producción.
                </p>
                {SUGERENCIAS.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-crema-50 hover:border-tierra-700/20 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-tierra-700 text-white rounded-br-sm"
                      : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {/* Indicador de carga */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <span className="flex gap-1.5 items-center">
                    {[0, 150, 300].map((d) => (
                      <span key={d}
                        className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-neutral-200 p-3 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribí tu consulta…"
              disabled={loading}
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50 bg-white"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-40 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="size-12 rounded-full bg-tierra-700 text-white shadow-lg hover:bg-tierra-800 transition-all hover:scale-105 flex items-center justify-center"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
