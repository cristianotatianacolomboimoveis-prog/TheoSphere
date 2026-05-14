"use client";

import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/Toast";
import InstallBanner from "@/components/InstallBanner";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { useTheoStore } from "@/store/useTheoStore";
import dynamic from "next/dynamic";
import "@/lib/i18n";

// O registro do Service Worker deve ser client-side
const SWRegistrar = dynamic(() => import("@/components/SWRegistrar"), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const fetchBooks = useTheoStore(state => state.fetchBooks);

  useEffect(() => {
    setMounted(true);
    fetchBooks();
  }, [fetchBooks]);

  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
        {mounted && (
          <>
            <InstallBanner />
            <SWRegistrar />
          </>
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}
