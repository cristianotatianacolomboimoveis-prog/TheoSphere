"use client";

import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/Toast";
import InstallBanner from "@/components/InstallBanner";
import dynamic from "next/dynamic";

// O registro do Service Worker deve ser client-side
const SWRegistrar = dynamic(() => import("@/components/SWRegistrar"), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ToastProvider>
      {children}
      {mounted && (
        <>
          <InstallBanner />
          <SWRegistrar />
        </>
      )}
    </ToastProvider>
  );
}
