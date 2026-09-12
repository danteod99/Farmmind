import { redirect } from "next/navigation";

// El dashboard SMM se retiró (2026-09). El panel arranca en el marketplace de cuentas.
export default function SmmIndex() {
  redirect("/smm/services");
}
