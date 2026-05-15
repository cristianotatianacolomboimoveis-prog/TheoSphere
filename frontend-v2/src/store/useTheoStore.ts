import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api';

export type ToolId = "dashboard" | "exegesis" | "guide" | "word" | "factbook" | "encyclopedia" | "sermon" | "study" | "notes" | "library" | "manuscripts" | "atlas" | "ai" | "console" | "graph" | "study_mode" | "progress" | "community" | "settings" | null;

export interface PageContext {
  pageId: string;
  title: string;
  metadata: {
    courseId?: string;
    chapterId?: string;
    contentSummary?: string;
    recentActivity?: string[];
  };
}

interface UserPin {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number, number];
  year: number;
}

export interface BibleBook {
  id: number;
  namePt: string;
  nameEn: string;
  abbreviation: string;
  chapters: number;
  testament: string;
  yearStart?: number;
  author?: string;
}

interface TheoState {
  // Navigation
  activeBook: string;
  activeChapter: number;
  activeVerseId: string | null;
  visibleVerseId: string | null;
  
  // App Context
  activeTool: ToolId;
  currentContext: PageContext | null;
  viewMode: "reading" | "exegesis";
  currentTime: number;
  isOffline: boolean;
  
  // Data / Persistence
  userPins: UserPin[];
  books: BibleBook[];
  _hasHydrated: boolean;
  
  // Actions
  setActiveTool: (tool: ToolId) => void;
  setCurrentContext: (context: PageContext | null) => void;
  setBibleReference: (book: string, chapter: number) => void;
  setActiveVerse: (verseId: string | null) => void;
  setVisibleVerse: (verseId: string | null) => void;
  setViewMode: (mode: "reading" | "exegesis") => void;
  setCurrentTime: (year: number) => void;
  setOfflineStatus: (status: boolean) => void;
  addUserPin: (pin: Omit<UserPin, 'id'>) => void;
  setHasHydrated: (state: boolean) => void;
  fetchBooks: () => Promise<void>;
}

export const useTheoStore = create<TheoState>()(
  persist(
    (set) => ({
      activeBook: "Gênesis",
      activeChapter: 1,
      activeVerseId: null,
      visibleVerseId: null,
      activeTool: "dashboard",
      currentContext: null,
      viewMode: "reading",
      currentTime: -2100,
      isOffline: false,
      userPins: [],
      books: [],
      _hasHydrated: false,

      setActiveTool: (tool) => set({ activeTool: tool }),
      setCurrentContext: (context) => set({ currentContext: context }),
      setBibleReference: (book, chapter) => set({ activeBook: book, activeChapter: chapter }),
      setActiveVerse: (verseId) => set({ activeVerseId: verseId }),
      setVisibleVerse: (verseId) => set({ visibleVerseId: verseId }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCurrentTime: (year) => set({ currentTime: year }),
      setOfflineStatus: (status) => set({ isOffline: status }),
      addUserPin: (pin) => set((state) => ({ 
        userPins: [...state.userPins, { ...pin, id: crypto.randomUUID() }]
      })),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      fetchBooks: async () => {
        try {
          const res = await api.get<any>('bible/books');
          if (res.success && res.data) {
            set({ books: res.data });
          }
        } catch (err) {
          console.warn('[Store] API offline, using cached or empty books:', err);
        }
      },
    }),
    {
      name: 'theosphere-context',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migração de nomes antigos (English/Sem acento -> Português/Com acento)
          const migrations: Record<string, string> = {
            "Genesis": "Gênesis", "Exodus": "Êxodo", "Leviticus": "Levítico", "Numbers": "Números", "Deuteronomy": "Deuteronômio",
            "Joshua": "Josué", "Judges": "Juízes", "Ruth": "Rute", "1 Kings": "1 Reis", "2 Kings": "2 Reis", "1 Chronicles": "1 Crônicas", "2 Chronicles": "2 Crônicas",
            "Ezra": "Esdras", "Nehemiah": "Neemias", "Esther": "Ester", "Job": "Jó", "Psalms": "Salmos", "Proverbs": "Provérbios", "Ecclesiastes": "Eclesiastes", "Song of Solomon": "Cantares",
            "Isaiah": "Isaías", "Jeremiah": "Jeremias", "Lamentations": "Lamentações", "Ezekiel": "Ezequiel", "Daniel": "Daniel", "Hosea": "Oséias", "Joel": "Joel", "Amos": "Amós", "Obadiah": "Obadias", "Jonah": "Jonas", "Micah": "Miquéias", "Nahum": "Naum", "Habakkuk": "Habacuque", "Zephaniah": "Sofonias", "Haggai": "Ageu", "Zechariah": "Zacarias", "Malachi": "Malaquias",
            "Matthew": "Mateus", "Mark": "Marcos", "Luke": "Lucas", "John": "João", "Acts": "Atos", "Romans": "Romanos", "1 Corinthians": "1 Coríntios", "2 Corinthians": "2 Coríntios", "Galatians": "Gálatas", "Ephesians": "Efésios", "Philippians": "Filipenses", "Colossians": "Colossenses", "1 Thessalonians": "1 Tessalonicenses", "2 Thessalonians": "2 Tessalonicenses", "1 Timothy": "1 Timóteo", "2 Timothy": "2 Timóteo", "Titus": "Tito", "Philemon": "Filemom", "Hebrews": "Hebreus", "James": "Tiago", "1 Peter": "1 Pedro", "2 Peter": "2 Pedro", "1 John": "1 João", "2 John": "2 João", "3 John": "3 João", "Jude": "Judas", "Revelation": "Apocalipse"
          };
          
          if (migrations[state.activeBook]) {
            state.setBibleReference(migrations[state.activeBook], state.activeChapter);
          }
          
          state.setHasHydrated(true);
        }
      },
    }
  )
);
