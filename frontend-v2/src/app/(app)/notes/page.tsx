"use client";

import dynamic from "next/dynamic";
import { useTheoStore } from "@/store/useTheoStore";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), {
  ssr: false,
});

export default function NotesPage() {
  const { activeBook, activeChapter, activeVerseId, visibleVerseId } =
    useTheoStore();
  const ref =
    visibleVerseId || activeVerseId || `${activeBook} ${activeChapter}`;

  return <NoteEditor reference={ref} />;
}
