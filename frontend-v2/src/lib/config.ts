/**
 * TheoSphere Enterprise Configuration
 * Single source of truth for environment variables and global constants.
 */

export const CONFIG = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3002",
  DEFAULT_LANGUAGE: "pt-BR",
  VERSION: "2.1.0-enterprise",
  ENVIRONMENT: process.env.NODE_ENV || "development",

  // Feature Flags
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  OFFLINE_MODE: true, // Priority for local DuckDB cache

  // API.Bible (ABS) Integration
  API_BIBLE_KEY: process.env.NEXT_PUBLIC_API_BIBLE_KEY || "",
  API_BIBLE_ID: process.env.NEXT_PUBLIC_API_BIBLE_ID || "",

  // A Bíblia Digital Integration
  ABIBLIA_DIGITAL_TOKEN: process.env.NEXT_PUBLIC_ABIBLIADIGITAL_TOKEN || "",
};

export const I18N = {
  common: {
    loading: "Carregando...",
    error: "Ocorreu um erro inesperado.",
    retry: "Tentar novamente",
    close: "Fechar",
    save: "Salvar",
    cancel: "Cancelar",
  },
  bible: {
    fetching: "Buscando exegese PhD...",
    syncing: "Sincronizando Offline: ",
    local: "💾 Local",
    remote: "🌐 API",
    searchPlaceholder: "Buscar versículos...",
  },
  auth: {
    login: "Entrar",
    logout: "Sair",
  },
};
