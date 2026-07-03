"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";

const BibleReader = dynamic(() => import("@/components/BibleReader"), {
  ssr: false,
  loading: () => <LoadingPane />,
});
const PassageGuide = dynamic(() => import("@/components/PassageGuide"), {
  ssr: false,
  loading: () => <LoadingPane />,
});
const WordStudy = dynamic(() => import("@/components/WordStudy"), {
  ssr: false,
  loading: () => <LoadingPane />,
});

function LoadingPane() {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );
}

const WorkspaceLazy = dynamic(
  () =>
    import("@/components/layout/Workspace").then((m) => ({
      default: m.Workspace,
    })),
  { ssr: false },
);

export default function StudyPage() {
  const { activeBook, activeChapter, activeVerseId, visibleVerseId } =
    useTheoStore();
  const [pendingStrongId, setPendingStrongId] = useState<string | null>(null);
  const currentReference =
    visibleVerseId || activeVerseId || `${activeBook} ${activeChapter}`;

  return (
    <WorkspaceLazy
      leftTitle="Escritura Sagrada"
      middleTitle="Guia de Passagem & Comentários"
      rightTitle="Análise Lexical & Strong's"
      leftPane={
        <BibleReader
          hideHeader
          onClose={() => {}}
          onOpenWordStudy={(id) => setPendingStrongId(id)}
        />
      }
      rightPane={
        <PassageGuide onClose={() => {}} initialRef={currentReference} />
      }
      bottomPane={
        <WordStudy
          hideHeader
          onClose={() => {}}
          initialStrongId={pendingStrongId}
        />
      }
    />
  );
}
