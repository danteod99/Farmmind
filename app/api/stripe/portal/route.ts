import { whatsappUrl } from "@/app/lib/whatsapp";

// Portal de facturación desactivado. La gestión de la cuenta se hace por WhatsApp.
export async function POST() {
  return Response.json({
    url: whatsappUrl(
      "Hola 👋 Quiero gestionar mi cuenta de TRUST MIND."
    ),
  });
}
