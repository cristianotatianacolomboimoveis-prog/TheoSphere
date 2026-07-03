"use client";

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
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-grow relative h-full">
        <TheoSphere3D />
      </div>
      <TheoSphereDashboard />
    </div>
  );
}
