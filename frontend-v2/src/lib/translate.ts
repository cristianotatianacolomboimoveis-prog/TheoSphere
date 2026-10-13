/**
 * translate.ts
 * Utilitário de tradução dinâmica de comentários exegéticos clássicos para português (PT-BR).
 * Inclui cache em memória, persistência em sessionStorage e deduplicação de requisições em voo.
 */

const translationCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

/**
 * Detecta se o texto está predominantemente em inglês.
 */
export function isEnglishText(text: string): boolean {
  if (!text || text.length < 15) return false;
  const englishTokens = [
    /\bthe\b/i,
    /\band\b/i,
    /\bof\b/i,
    /\bthat\b/i,
    /\bunto\b/i,
    /\bshall\b/i,
    /\bwhich\b/i,
    /\bhath\b/i,
    /\bthou\b/i,
    /\bthee\b/i,
    /\bgrace\b/i,
    /\bfaith\b/i,
    /\btherefore\b/i,
    /\bchapter\b/i,
  ];

  let matches = 0;
  for (const token of englishTokens) {
    if (token.test(text)) matches++;
    if (matches >= 2) return true;
  }
  return false;
}

/**
 * Traduz um texto para o idioma desejado (padrão 'pt').
 */
export async function translateText(
  text: string,
  targetLang: string = "pt",
): Promise<string> {
  const clean = text?.trim();
  if (!clean) return "";

  // 1. Verifica cache em memória (resposta imediata em 0ms)
  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 2. Verifica cache em sessionStorage (persistência durante a sessão sem rede)
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(`tr_${cacheKey.slice(0, 80)}`);
      if (stored) {
        translationCache.set(cacheKey, stored);
        return stored;
      }
    } catch {
      // sessionStorage pode falhar em modo restrito
    }
  }

  // Se já for português ou não parecer inglês, retorna o original sem gastar cota
  if (targetLang === "pt" && !isEnglishText(clean)) {
    translationCache.set(cacheKey, clean);
    return clean;
  }

  // 3. Deduplicação em voo: se já há uma requisição idêntica ocorrendo, compartilha a mesma Promise
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("theosphere-access-token")
          : null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/translate", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: clean, targetLang }),
      });

      if (res.ok) {
        const data = (await res.json()) as { translated?: string };
        if (data.translated) {
          translationCache.set(cacheKey, data.translated);
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.setItem(`tr_${cacheKey.slice(0, 80)}`, data.translated);
            } catch {}
          }
          return data.translated;
        }
      }

      // Fallback com o texto original em caso de rate limit
      return clean;
    } catch {
      return clean;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}
