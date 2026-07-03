"use client";

import dynamic from "next/dynamic";

const Encyclopedia = dynamic(() => import("@/components/Encyclopedia"), {
  ssr: false,
});

export default function EncyclopediaPage() {
  return <Encyclopedia onClose={() => {}} />;
}
