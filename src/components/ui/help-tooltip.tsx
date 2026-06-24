"use client";

import { useState } from "react";

export function HelpTooltip({ text, wide = false }: { text: string; wide?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        className="size-4 rounded-full bg-neutral-200 text-neutral-500 text-[10px] flex items-center justify-center cursor-help font-bold hover:bg-neutral-300 transition-colors leading-none select-none"
        aria-label="Ayuda"
      >
        ?
      </button>

      {visible && (
        <span
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${wide ? "w-72" : "w-52"} bg-neutral-900 text-white text-xs rounded-xl px-3 py-2.5 z-50 text-left leading-relaxed pointer-events-none shadow-xl`}
          role="tooltip"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </span>
      )}
    </span>
  );
}
