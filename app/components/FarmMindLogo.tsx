export function FarmMindLogo({ size = 36 }: { size?: number }) {
  // For very small sizes (message bubbles etc.), show a styled "T" icon
  if (size <= 20) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontWeight: 900,
        fontSize: `${size * 0.85}px`,
        color: "#007ABF",
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}>T</span>
    );
  }

  // For normal and large sizes, use the actual logo image
  return (
    <img
      src="/trustworld-logo.jpg"
      alt="TRUST MIND"
      style={{
        height: `${size}px`,
        width: "auto",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
