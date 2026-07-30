"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function SWRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    // Em desenvolvimento, remover SWs antigos para evitar conflitos de cache
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => {
          r.unregister();
        });
      });
      return;
    }

    // Em produção, registrar normalmente
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {})
      .catch((error) => {
        logger.error("TheoSphere: Falha no Service Worker", error);
      });
  }, []);

  return null;
}
