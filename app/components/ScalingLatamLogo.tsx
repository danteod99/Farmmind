export function ScalingLatamLogo({ size = 36, accentColor = "#007ABF" }: { size?: number; accentColor?: string }) {
  const fontSize = size * 0.45;
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: `${size * 0.28}px`,
      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontWeight: 900,
        fontSize: `${fontSize}px`,
        color: "white",
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}>SL</span>
    </div>
  );
}
