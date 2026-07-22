import { whatsappUrl } from "@/app/lib/whatsapp";

// Recarga de saldo desactivada como pago online. Se gestiona por WhatsApp.
export async function POST() {
  return Response.json({
    url: whatsappUrl(
      "Hola 👋 Quiero recargar saldo en mi panel SMM de TRUST MIND."
    ),
  });
}
