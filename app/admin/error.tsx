"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08080f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          background: "#12121e",
          borderRadius: 16,
          padding: "48px 32px",
          border: "1px solid #1e1e30",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#1a1a2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 28,
            color: "#56B4E0",
          }}
        >
          !
        </div>
        <h2
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: 600,
            margin: "0 0 8px",
          }}
        >
          Error en Admin
        </h2>
        <p
          style={{
            color: "#9ca3af",
            fontSize: 14,
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          {error.message || "Ocurri\u00f3 un error inesperado. Int\u00e9ntalo de nuevo."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#56B4E0",
              color: "#08080f",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <a
            href="/"
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid #2a2a42",
              borderRadius: 10,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
