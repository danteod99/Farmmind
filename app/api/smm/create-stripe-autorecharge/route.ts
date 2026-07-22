import { whatsappUrl } from "@/app/lib/whatsapp";

// Auto-recarga desactivada como pago online. Se gestiona por WhatsApp.
export async function POST() {
  return Response.json({
    url: whatsappUrl(
      "Hola 👋 Quiero activar la auto-recarga de mi panel SMM de TRUST MIND."
    ),
  });
}
