"use client";

import { PanelProvider, usePanel } from "./context";
import { useParams } from "next/navigation";
import { useEffect } from "react";

function FacebookPixel() {
  const { reseller } = usePanel();
  const pixelId = reseller?.facebook_pixel_id;

  useEffect(() => {
    if (!pixelId) return;

    // Avoid duplicate injection
    if (document.getElementById("fb-pixel-script")) return;

    // Inject Facebook Pixel
    const script = document.createElement("script");
    script.id = "fb-pixel-script";
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId.replace(/[^0-9]/g, "")}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Noscript fallback
    const noscript = document.createElement("noscript");
    noscript.id = "fb-pixel-noscript";
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId.replace(/[^0-9]/g, "")}&ev=PageView&noscript=1"/>`;
    document.head.appendChild(noscript);

    return () => {
      document.getElementById("fb-pixel-script")?.remove();
      document.getElementById("fb-pixel-noscript")?.remove();
    };
  }, [pixelId]);

  return null;
}

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  return (
    <PanelProvider slug={slug}>
      <FacebookPixel />
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
