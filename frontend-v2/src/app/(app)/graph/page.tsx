"use client";

import dynamic from "next/dynamic";

const TheoSGraph = dynamic(() => import("@/components/TheoSGraph"), {
  ssr: false,
});

export default function GraphPage() {
  return <TheoSGraph onClose={() => {}} />;
}
