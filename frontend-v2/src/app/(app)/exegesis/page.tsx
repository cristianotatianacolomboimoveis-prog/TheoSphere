"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";

const BibleReader = dynamic(() => import("@/components/BibleReader"), {
  ssr: false,
  loading: () => <LoadingPane />,
});
const ExegesisPanel = dynamic(() => import("@/components/ExegesisPanel"), {
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

// Workspace é named export
const WorkspaceLazy = dynamic(
  () =>
    import("@/components/layout/Workspace").then((m) => ({
      default: m.Workspace,
    })),
  { ssr: false },
);

export default function ExegesisPage() {
  const { activeBook, activeChapter, activeVerseId, visibleVerseId } =
    useTheoStore();
  const [pendingStrongId, setPendingStrongId] = useState<string | null>(null);
  const currentReference =
    visibleVerseId || activeVerseId || `${activeBook} ${activeChapter}`;

  return (
    <WorkspaceLazy
      leftTitle="Escritura Sagrada"
      middleTitle="Análise Crítica & Interlinear"
      rightTitle="Análise Lexical & Strong's"
      leftPane={
        <BibleReader
          hideHeader
          onClose={() => {}}
          onOpenWordStudy={(id) => setPendingStrongId(id)}
        />
      }
      rightPane={
        <ExegesisPanel hideHeader verse={currentReference} onClose={() => {}} />
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
