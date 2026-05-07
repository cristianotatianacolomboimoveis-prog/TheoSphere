"use client";

import { useEffect } from "react";

export default function SWRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("TheoSphere: Service Worker registrado em", registration.scope);
        })
        .catch((error) => {
          console.error("TheoSphere: Falha no Service Worker", error);
        });
    }
  }, []);

  return null;
}
