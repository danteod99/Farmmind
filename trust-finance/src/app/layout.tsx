import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata: Metadata = {
  title: "Trust Finance - Financiamiento de Importaciones",
  description: "Financia tus importaciones con solo el 30% de inicial. Paga el 70% restante cuando vendas tu mercaderia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Poppins', sans-serif" }} className="bg-white text-trust-dark">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
