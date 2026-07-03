"use client";

import dynamic from "next/dynamic";

const Factbook = dynamic(() => import("@/components/Factbook"), { ssr: false });

export default function FactbookPage() {
  return <Factbook onClose={() => {}} />;
}
