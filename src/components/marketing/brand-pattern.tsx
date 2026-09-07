export function BrandPattern() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none select-none" style={{ opacity: 0.06 }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="em-icons" x="0" y="0" width="180" height="120" patternUnits="userSpaceOnUse">
            <g transform="translate(5,5)" stroke="#2C25B5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="26" height="18" rx="2.5"/>
              <rect x="6" y="9" width="14" height="10" rx="1"/>
              <line x1="8" y1="13" x2="10" y2="13"/><line x1="12" y1="11" x2="12" y2="15"/><line x1="14" y1="11" x2="14" y2="15"/>
              <circle cx="22" cy="3" r="1.2" fill="#2C25B5" stroke="none"/><circle cx="26" cy="3" r="1.2" fill="#2C25B5" stroke="none"/>
            </g>
            <g transform="translate(65,5)" stroke="#2C25B5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="15" cy="17" r="10"/>
              <path d="M15 11v6l3.5 3.5"/>
              <path d="M9 3c1.7-.8 3.8-1 6-1s4.3.2 6 1"/>
              <line x1="24" y1="7" x2="25.5" y2="5.5"/>
            </g>
            <g transform="translate(125,5)" stroke="#2C25B5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="14" r="10"/>
              <line x1="12" y1="8" x2="12" y2="14"/><line x1="12" y1="14" x2="16" y2="14"/>
              <line x1="22" y1="10" x2="26" y2="10"/><line x1="22" y1="14" x2="26" y2="14"/><line x1="22" y1="18" x2="26" y2="18"/>
            </g>
            <g transform="translate(5,65)" stroke="#2C25B5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 25s-11-6-11-13a6 6 0 0 1 11-4 6 6 0 0 1 11 4c0 7-11 13-11 13z"/>
            </g>
            <g transform="translate(65,65)" stroke="#2C25B5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 12h16v8a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4v-8z"/>
              <path d="M7 12c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4"/>
              <circle cx="15" cy="5" r="1.8" fill="#2C25B5" stroke="none"/>
              <line x1="4" y1="14" x2="2" y2="14"/><line x1="26" y1="14" x2="28" y2="14"/>
            </g>
            <g transform="translate(125,65)" stroke="#2C25B5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M26 14c0 6.6-5.4 12-12 12S2 20.6 2 14 7.4 2 14 2"/>
              <path d="M20 2l2.5 2.5L17 10"/>
              <path d="M9 14l3 3 7-7"/>
              <line x1="25" y1="5" x2="26.5" y2="3"/><line x1="27" y1="8" x2="28.5" y2="7"/>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#em-icons)"/>
      </svg>
    </div>
  );
}
