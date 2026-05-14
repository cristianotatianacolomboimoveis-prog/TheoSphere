import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  pt: {
    translation: {
      "dashboard": {
        "title": "TheoSphere OS",
        "subtitle": "Operacional Teológico Inteligente"
      },
      "tools": {
        "study_mode": "Modo Estudo (Scholar)",
        "atlas_premium": "Atlas Premium",
        "graph": "Grafo Bíblico",
        "library": "Biblioteca Enterprise"
      },
      "study": {
        "bible": "Escrituras",
        "exegesis": "Exegese IA",
        "map": "Atlas Geoespacial",
        "3d": "Maquetes 3D",
        "graph": "Grafo Bíblico"
      },
      "common": {
        "search": "Buscar...",
        "settings": "Configurações",
        "close": "Fechar",
        "save": "Salvar",
        "loading": "Carregando...",
        "error": "Ocorreu um erro inesperado."
      }
    }
  },
  en: {
    translation: {
      "dashboard": {
        "title": "TheoSphere OS",
        "subtitle": "Theological Intelligence OS"
      },
      "tools": {
        "study_mode": "Study Mode (Scholar)",
        "atlas_premium": "Premium Atlas",
        "graph": "Bible Graph",
        "library": "Enterprise Library"
      },
      "study": {
        "bible": "Scriptures",
        "exegesis": "AI Exegesis",
        "map": "Geospatial Atlas",
        "3d": "3D Models",
        "graph": "Bible Graph"
      },
      "common": {
        "search": "Search...",
        "settings": "Settings",
        "close": "Close",
        "save": "Save",
        "loading": "Loading...",
        "error": "An unexpected error occurred."
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
