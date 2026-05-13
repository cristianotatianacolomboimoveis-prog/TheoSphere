/**
 * Centralized user-facing strings in pt-BR.
 *
 * Use in new components:
 *   import { MSG } from "@/constants/messages";
 *   <button>{MSG.common.save}</button>
 *
 * Existing components can migrate incrementally. The bigger i18n scaffold
 * lives at src/i18n/ — this file complements it for component-local strings
 * that don't need full ICU support.
 */

export const MSG = {
  common: {
    loading: "Carregando…",
    loadingData: "Buscando dados…",
    error: "Ocorreu um erro inesperado.",
    retry: "Tentar novamente",
    close: "Fechar",
    save: "Salvar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    delete: "Excluir",
    edit: "Editar",
    search: "Buscar",
    apply: "Aplicar",
    reset: "Limpar",
    back: "Voltar",
    next: "Próximo",
    previous: "Anterior",
    yes: "Sim",
    no: "Não",
    empty: "Nada por aqui ainda",
    noResults: "Nenhum resultado encontrado",
    networkError: "Erro de conexão. Verifique sua internet.",
    sessionExpired: "Sessão expirada. Faça login novamente.",
    unauthorized: "Você não tem permissão para esta ação.",
    rateLimited: "Muitas requisições. Aguarde alguns instantes.",
    serverError: "Erro interno do servidor. Tente mais tarde.",
  },
  auth: {
    login: "Entrar",
    logout: "Sair",
    register: "Cadastrar",
    email: "E-mail",
    password: "Senha",
    welcomeBack: "Bem-vindo de volta",
    createAccount: "Crie sua conta",
    invalidCredentials: "Credenciais inválidas.",
    emailTaken: "E-mail já cadastrado.",
    weakPassword:
      "A senha precisa de no mínimo 12 caracteres, com maiúscula, minúscula e número.",
    confirmLogout: "Deseja sair da sua conta?",
  },
  bible: {
    fetching: "Buscando exegese…",
    chapter: "Capítulo",
    verse: "Versículo",
    versions: "Versões",
    translations: "Traduções",
    notes: "Notas",
    commentary: "Comentário",
    crossReferences: "Referências cruzadas",
    syncing: "Sincronizando…",
    searchPlaceholder: "Buscar versículos…",
    referenceExample: "Ex: João 3:16, Romanos 8:28",
  },
  tools: {
    passageGuide: "Guia de Passagem",
    wordStudy: "Estudo de Palavras",
    factbook: "Enciclopédia Bíblica",
    sermonBuilder: "Criador de Sermões",
    studyBuilder: "Criador de Estudos",
    library: "Biblioteca",
    aiAssistant: "Assistente TheoAI",
    agenticConsole: "Console Agêntica",
    atlas: "Atlas",
    manuscripts: "Manuscritos Digitais",
  },
  ai: {
    thinking: "TheoAI está pensando…",
    quotaExceeded: "Limite de consultas atingido. Tente novamente em instantes.",
    askPlaceholder: "Faça uma pergunta teológica…",
  },
} as const;

export type MessageKey = typeof MSG;
