"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const TheoSphere3D = dynamic(
  () => import("@/components/visualizer/TheoSphere3D"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    ),
  },
);

const TheoSphereDashboard = dynamic(
  () =>
    import("@/components/dashboard/TheoSphereDashboard").then((m) => ({
      default: m.TheoSphereDashboard,
    })),
  { ssr: false },
);

export default function AtlasPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div className="flex-grow relative h-full transition-all duration-300">
        <TheoSphere3D
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
      </div>

      <div
        className={`h-full transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
          isSidebarOpen
            ? "w-[350px] opacity-100"
            : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        <TheoSphereDashboard />
      </div>
    </div>
  );
}
