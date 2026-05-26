"use client";

import { FarmMindLogo } from "@/app/components/FarmMindLogo";

export function TrustFooter() {
  return (
    <footer style={{
      position: "relative",
      background: "linear-gradient(180deg, #07070e 0%, #040410 100%)",
      borderTop: "1px solid #007ABF25",
      overflow: "hidden",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "40px 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "14px",
    }}>
      <FarmMindLogo size={48} />
    </footer>
  );
}
