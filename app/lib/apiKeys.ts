// BYOK — las API Keys del usuario se guardan SOLO en su navegador (localStorage)
// y se mandan por header a las rutas de IA. Así cada quien usa su propia key
// (Anthropic para análisis/retomas, Groq para transcripción) y no la del sistema.

const A_KEY = "tm_anthropic_key";
const G_KEY = "tm_groq_key";

export function getApiKeys(): { anthropic: string; groq: string } {
  if (typeof window === "undefined") return { anthropic: "", groq: "" };
  return {
    anthropic: localStorage.getItem(A_KEY) || "",
    groq: localStorage.getItem(G_KEY) || "",
  };
}

export function setApiKeys(anthropic: string, groq: string): void {
  if (typeof window === "undefined") return;
  if (anthropic.trim()) localStorage.setItem(A_KEY, anthropic.trim()); else localStorage.removeItem(A_KEY);
  if (groq.trim()) localStorage.setItem(G_KEY, groq.trim()); else localStorage.removeItem(G_KEY);
}

// Headers a incluir en los fetch a las rutas de IA (solo los que estén configurados).
export function apiKeyHeaders(): Record<string, string> {
  const { anthropic, groq } = getApiKeys();
  const h: Record<string, string> = {};
  if (anthropic) h["x-anthropic-key"] = anthropic;
  if (groq) h["x-groq-key"] = groq;
  return h;
}
