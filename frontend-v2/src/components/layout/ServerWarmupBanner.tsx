"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, WifiOff, X } from "lucide-react";
import { API_URL } from "@/lib/api";

export function ServerWarmupBanner() {
  const [status, setStatus] = useState<
    "idle" | "warming" | "connected" | "error"
  >("idle");
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("theosphere_warmup_dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Se o servidor já respondeu anteriormente nesta sessão, não incomoda
    try {
      if (sessionStorage.getItem("theosphere_server_connected") === "true") {
        return;
      }
    } catch {}

    let isMounted = true;
    const startTime = Date.now();

    // Se demorar mais de 2.8s para responder, assume que o backend está em cold-start (Render Free Tier)
    const timer = setTimeout(() => {
      if (isMounted && status === "idle") {
        setStatus("warming");
      }
    }, 2800);

    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(`${API_URL}/health/live`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        }).catch(() => null);

        clearTimeout(timeoutId);
        clearTimeout(timer);

        if (!isMounted) return;

        const duration = Date.now() - startTime;

        if (res && (res.ok || res.status === 200 || res.status === 404)) {
          try {
            sessionStorage.setItem("theosphere_server_connected", "true");
          } catch {}

          // Se estava mostrando a mensagem de aquecimento, exibe "conectado" por 2.5s
          if (status === "warming" || duration > 2800) {
            setStatus("connected");
            setTimeout(() => {
              if (isMounted) setStatus("idle");
            }, 3000);
          } else {
            setStatus("idle");
          }
        } else if (duration > 2800) {
          setStatus("warming");
        }
      } catch {
        if (isMounted && status === "warming") {
          setStatus("error");
        }
      }
    };

    checkServer();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (dismissed || status === "idle") return null;

  return (
    <aside
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[999] max-w-md w-[calc(100vw-2rem)] select-none animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div
        className={`p-3.5 rounded-xl border shadow-2xl backdrop-blur-xl transition-all flex items-start gap-3 ${
          status === "connected"
            ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-100"
            : status === "error"
              ? "bg-rose-950/85 border-rose-500/30 text-rose-100"
              : "bg-[#0B0F17]/90 border-amber-500/30 text-amber-100 shadow-amber-500/5"
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {status === "connected" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-in zoom-in-75 duration-200" />
          ) : status === "error" ? (
            <WifiOff className="w-4 h-4 text-rose-400" />
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75" />
              <Sparkles className="w-4 h-4 text-amber-400 relative" />
            </div>
          )}
        </div>

        <div className="flex-1 pr-1 text-left">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[12px] font-bold tracking-tight">
              {status === "connected"
                ? "Servidor Exegético Conectado"
                : status === "error"
                  ? "Servidor em Manutenção"
                  : "Inicializando Núcleo Teológico"}
            </h4>
            <button
              onClick={() => {
                setDismissed(true);
                try {
                  sessionStorage.setItem("theosphere_warmup_dismissed", "true");
                } catch {}
              }}
              className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-white rounded-md transition-colors"
              title="Fechar"
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] leading-relaxed opacity-90 mt-0.5">
            {status === "connected"
              ? "Pronto! O acervo clássico de 90 obras e o Copilot IA estão operantes."
              : status === "error"
                ? "A biblioteca offline segue ativa. Algumas buscas na nuvem podem oscilar."
                : "Despertando o servidor em nuvem (Render Free Tier). Esse processo leva de 20 a 40 segundos no primeiro acesso."}
          </p>
        </div>
      </div>
    </aside>
  );
}
