"use client";

import dynamic from "next/dynamic";

const TheologicalLibrary = dynamic(
  () => import("@/components/TheologicalLibrary"),
  { ssr: false },
);

export default function LibraryPage() {
  return <TheologicalLibrary onClose={() => {}} />;
}
