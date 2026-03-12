export function FarmMindLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="fm-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="0.5 0 0.8 0 0.2  0 0 0.5 0 0  0.8 0 1 0 0.3  0 0 0 1 0"
            result="purple-blur"
          />
          <feMerge>
            <feMergeNode in="purple-blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines — outer frame */}
      <line x1="8" y1="8"  x2="32" y2="8"  stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="32" x2="32" y2="32" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8"  y1="8" x2="8"  y2="32" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="20" y1="8" x2="20" y2="32" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="32" y1="8" x2="32" y2="32" stroke="white" strokeWidth="1.4" strokeLinecap="round" />

      {/* Diagonal accent lines */}
      <line x1="8"  y1="8"  x2="20" y2="20" stroke="white" strokeWidth="2"   strokeLinecap="round" />
      <line x1="20" y1="20" x2="32" y2="32" stroke="white" strokeWidth="2"   strokeLinecap="round" />

      {/* Nodes with glow */}
      <circle cx="8"  cy="8"  r="3"   fill="white" filter="url(#fm-glow)" />
      <circle cx="20" cy="8"  r="3"   fill="white" filter="url(#fm-glow)" />
      <circle cx="32" cy="8"  r="3"   fill="white" filter="url(#fm-glow)" />
      <circle cx="8"  cy="20" r="3"   fill="white" filter="url(#fm-glow)" />
      <circle cx="20" cy="20" r="3.8" fill="white" filter="url(#fm-glow)" />
      <circle cx="32" cy="20" r="3"   fill="white" filter="url(#fm-glow)" />
      <circle cx="8"  cy="32" r="3"   fill="white" filter="url(#fm-glow)" />
      <circle cx="20" cy="32" r="3"   fill="white" filter="url(#fm-glow)" />
      <circle cx="32" cy="32" r="3"   fill="white" filter="url(#fm-glow)" />
    </svg>
  );
}
