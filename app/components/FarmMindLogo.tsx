"use client";

export function FarmMindLogo({ size = 36 }: { size?: number }) {
  const trustSize = size;
  const mindSize = Math.max(7, Math.round(size * 0.27));
  const mindLetterSpacing = Math.max(3, Math.round(size * 0.14));
  const marginTop = Math.round(size * -0.06);

  // Tiny icon mode (≤20px): just show "T"
  if (size <= 20) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Orbitron', 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: `${size * 0.85}px`,
          color: "#9ca3af",
          lineHeight: 1,
        }}
      >
        T
      </span>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
        gap: 0,
        userSelect: "none",
      }}
    >
      {/* TRUST */}
      <span
        style={{
          fontFamily: "'Orbitron', 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: `${trustSize}px`,
          color: "#9ca3af",
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        TRUST
      </span>

      {/* MIND with glitch effect */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: `${mindSize}px`,
          letterSpacing: `${mindLetterSpacing}px`,
          marginTop: `${marginTop}px`,
          lineHeight: 1,
        }}
      >
        {/* Purple glitch layer */}
        <span
          style={{
            position: "absolute",
            left: "-2px",
            top: "2px",
            color: "#a855f7",
            opacity: 0.7,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          MIND
        </span>
        {/* Cyan glitch layer */}
        <span
          style={{
            position: "absolute",
            left: "2px",
            top: "-1px",
            color: "#22d3ee",
            opacity: 0.7,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          MIND
        </span>
        {/* Main text */}
        <span style={{ position: "relative", zIndex: 1, color: "#e2e8f0" }}>
          MIND
        </span>
      </span>
    </div>
  );
}
