"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallBanner() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Fecha imediatamente o banner ao navegar entre telas conforme padrão oficial do React
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setIsVisible(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detecta se já está rodando como app instalado nativo (standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Verifica se já foi instalado ou se o usuário já dispensou o banner
    try {
      const isInstalled =
        localStorage.getItem("theosphere_pwa_installed") === "true";
      const isDismissed =
        localStorage.getItem("theosphere_pwa_dismissed") === "true" ||
        sessionStorage.getItem("theosphere_pwa_dismissed") === "true";

      if (isInstalled || isDismissed) {
        return;
      }
    } catch {
      // Ignora erro de acesso a storage
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Impede o Chrome de mostrar o popup padrão intrusivo
      e.preventDefault();
      setDeferredPrompt(e);

      // Não exibe se o usuário estiver na tela de login ou documentos institucionais
      if (
        pathname === "/login" ||
        pathname === "/termos" ||
        pathname === "/privacidade"
      ) {
        return;
      }

      try {
        const isInstalled =
          localStorage.getItem("theosphere_pwa_installed") === "true";
        const isDismissed =
          localStorage.getItem("theosphere_pwa_dismissed") === "true" ||
          sessionStorage.getItem("theosphere_pwa_dismissed") === "true";

        if (!isInstalled && !isDismissed) {
          setIsVisible(true);
        }
      } catch {
        // storage indisponível
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      try {
        localStorage.setItem("theosphere_pwa_installed", "true");
      } catch {}
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    // Permite que qualquer botão da interface (ex: TopBar / Configurações) dispare a instalação sob demanda
    const handleManualTrigger = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      }
    };
    window.addEventListener(
      "theosphere:open-install-prompt",
      handleManualTrigger,
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener(
        "theosphere:open-install-prompt",
        handleManualTrigger,
      );
    };
  }, [pathname, deferredPrompt]);

  // Se o banner estiver visível, recolhe automaticamente após 7 segundos se o usuário ignorar
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      try {
        // Não incomoda mais na mesma sessão de navegação
        sessionStorage.setItem("theosphere_pwa_dismissed", "true");
      } catch {}
    }, 7000);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      try {
        localStorage.setItem("theosphere_pwa_installed", "true");
      } catch {}
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      // Registra a dispensa permanentemente no dispositivo para nunca mais incomodar
      localStorage.setItem("theosphere_pwa_dismissed", "true");
      sessionStorage.setItem("theosphere_pwa_dismissed", "true");
    } catch {
      // localStorage indisponível
    }
  }, []);

  // Não renderiza nas telas de login/institucionais
  if (
    pathname === "/login" ||
    pathname === "/termos" ||
    pathname === "/privacidade"
  ) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10001] w-full max-w-sm"
        >
          <div className="mx-4 bg-[#0a0a0a]/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-amber-500/10 flex items-center justify-between gap-4 glass-heavy">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Download className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  Instalar TheoSphere
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Acesse offline como um aplicativo nativo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-black px-4 py-2 rounded-lg transition-all active:scale-95 uppercase tracking-wider"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
