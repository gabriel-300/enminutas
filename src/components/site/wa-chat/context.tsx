"use client";

import { createContext, useCallback, useContext, useState } from "react";

type WaChatState = { open: boolean; message: string };
type WaChatContextValue = { state: WaChatState; openChat: (message: string) => void; close: () => void };

const WaChatContext = createContext<WaChatContextValue | null>(null);

export function WaChatProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WaChatState>({ open: false, message: "" });
  const openChat = useCallback((message: string) => setState({ open: true, message }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return <WaChatContext.Provider value={{ state, openChat, close }}>{children}</WaChatContext.Provider>;
}

// Todo botón "Pedir" del sitio llama a openChat(mensaje) en vez de ser un <a href="wa.me/...">
// directo: primero se ve el panel en la página, y solo al confirmar se abre WhatsApp real.
export function useWaChat() {
  const ctx = useContext(WaChatContext);
  if (!ctx) throw new Error("useWaChat debe usarse dentro de <WaChatProvider>");
  return ctx;
}
