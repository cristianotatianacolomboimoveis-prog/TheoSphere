/**
 * translate.ts
 * Utilitário de tradução dinâmica de comentários exegéticos clássicos para português (PT-BR).
 * Inclui cache em memória para resposta instantânea (0ms em visualizações subsequentes)
 * e fallback resiliente.
 */

const translationCache = new Map<string, string>();

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

  // Verifica cache
  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Se já for português ou não parecer inglês, retorna o original
  if (targetLang === "pt" && !isEnglishText(clean)) {
    translationCache.set(cacheKey, clean);
    return clean;
  }

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
        return data.translated;
      }
    }

    // Fallback direto via endpoint público do Google
    const gtxUrl =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t` +
      `&q=${encodeURIComponent(clean.slice(0, 4000))}`;

    const fbRes = await fetch(gtxUrl);
    if (fbRes.ok) {
      const fbData = (await fbRes.json()) as unknown;
      if (Array.isArray(fbData) && Array.isArray(fbData[0])) {
        const translated = (fbData[0] as unknown[])
          .map((seg) =>
            Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : "",
          )
          .join("");

        if (translated) {
          translationCache.set(cacheKey, translated);
          return translated;
        }
      }
    }

    return clean;
  } catch {
    return clean;
  }
}
