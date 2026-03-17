"use client";

import { PanelProvider } from "./context";
import { useParams } from "next/navigation";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  return (
    <PanelProvider slug={slug}>
      <div
        style={{
          minHeight: "100vh",
          background: "#07070e",
          color: "#f0efff",
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        }}
      >
        {children}
      </div>
    </PanelProvider>
  );
}
