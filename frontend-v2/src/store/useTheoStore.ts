import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserPin {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number, number];
  year: number;
}

interface TheoState {
  activeVerseId: string | null;
  visibleVerseId: string | null;
  activeBook: string;
  activeChapter: number;
  currentTime: number;
  activeTrekId: string | null;
  isOffline: boolean;
  isLibraryOpen: boolean;
  userPins: UserPin[];
  _hasHydrated: boolean;
  viewMode: "reading" | "exegesis";
  showWordStudy: boolean;
  showTimeline: boolean;
  showSermonBuilder: boolean;
  
  setActiveVerse: (verseId: string | null) => void;
  setVisibleVerse: (verseId: string | null) => void;
  setViewMode: (mode: "reading" | "exegesis") => void;
  setBibleReference: (book: string, chapter: number) => void;
  setCurrentTime: (year: number) => void;
  setTrek: (trekId: string | null) => void;
  toggleLibrary: (isOpen?: boolean) => void;
  setOfflineStatus: (status: boolean) => void;
  addUserPin: (pin: Omit<UserPin, 'id'>) => void;
  setHasHydrated: (state: boolean) => void;
  setShowWordStudy: (show: boolean) => void;
  setShowTimeline: (show: boolean) => void;
  setShowSermonBuilder: (show: boolean) => void;
}

export const useTheoStore = create<TheoState>()(
  persist(
    (set) => ({
      activeVerseId: null,
      visibleVerseId: null,
      viewMode: "reading",
      activeBook: "Genesis",
      activeChapter: 1,
      currentTime: -2100,
      activeTrekId: null,
      isOffline: false,
      isLibraryOpen: false,
      userPins: [],
      _hasHydrated: false,
      showWordStudy: false,
      showTimeline: false,
      showSermonBuilder: false,

      setActiveVerse: (verseId) => set({ activeVerseId: verseId }),
      setVisibleVerse: (verseId) => set({ visibleVerseId: verseId }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setBibleReference: (book, chapter) => set({ activeBook: book, activeChapter: chapter }),
      setCurrentTime: (year) => set({ currentTime: year }),
      setTrek: (trekId) => set({ activeTrekId: trekId }),
      toggleLibrary: (isOpen) => set((state) => ({ isLibraryOpen: isOpen ?? !state.isLibraryOpen })),
      setOfflineStatus: (status) => set({ isOffline: status }),
      addUserPin: (pin) => set((state) => ({ 
        userPins: [...state.userPins, { ...pin, id: Math.random().toString(36).substring(2, 11) }]
      })),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setShowWordStudy: (show) => set({ showWordStudy: show }),
      setShowTimeline: (show) => set({ showTimeline: show }),
      setShowSermonBuilder: (show) => set({ showSermonBuilder: show }),
    }),
    {
      name: 'theosphere-context',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
