import { whatsappUrl } from "@/app/lib/whatsapp";

// Pagos online desactivados. La cuenta es gratis y la activación de servicios
// se gestiona por WhatsApp. Este endpoint devuelve un enlace de WhatsApp para
// que todos los botones de "pagar/activar" abran el chat en vez de un checkout.
export async function POST() {
  return Response.json({
    url: whatsappUrl(
      "Hola 👋 Quiero activar mi cuenta y usar los servicios de TRUST MIND. ¿Me ayudas?"
    ),
  });
}
