"use client";

import { useEffect, useRef } from "react";
import { useTheoStore, type PageContext } from "@/store/useTheoStore";

export function useTrackContext(context: PageContext | null) {
  const setCurrentContext = useTheoStore((state) => state.setCurrentContext);
  const currentContextRef = useRef<string | null>(null);

  useEffect(() => {
    // Evita loop infinito se o contexto for o mesmo (baseado no pageId)
    if (context?.pageId === currentContextRef.current) return;
    
    currentContextRef.current = context?.pageId || null;
    setCurrentContext(context);
    
    return () => {
      // Opcional: Limpar apenas se estiver saindo do sistema ou mudando radicalmente
      // setCurrentContext(null);
    };
  }, [context, setCurrentContext]);
}
