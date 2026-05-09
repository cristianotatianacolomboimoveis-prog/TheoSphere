import ptBR from "./messages/pt-BR.json";
import en from "./messages/en.json";

export type Locale = "pt-BR" | "en";

const messages: Record<Locale, Record<string, unknown>> = {
  "pt-BR": ptBR,
  en,
};

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const FALLBACK_LOCALE: Locale = "en";

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("pt")) return "pt-BR";
  if (lang.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

function lookup(dict: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

/**
 * Lightweight translation helper. Default locale is pt-BR; falls back to en, then to the key itself.
 * Usage: t("resourceGuide.tabs.resources")
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return (
    lookup(messages[locale], key) ??
    lookup(messages[FALLBACK_LOCALE], key) ??
    key
  );
}

export function getLocale(): Locale {
  return detectLocale();
}
