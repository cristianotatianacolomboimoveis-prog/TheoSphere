"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Bug,
  HelpCircle,
  Star,
  CheckCircle2,
  X,
  Send,
  Loader2,
} from "lucide-react";
import { usePathname } from "next/navigation";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackCategory = "sugestao" | "bug" | "duvida" | "elogio";

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const pathname = usePathname();
  const [category, setCategory] = useState<FeedbackCategory>("sugestao");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setErrorMessage("");

    const feedbackPayload = {
      id: `fb_${Date.now()}`,
      category,
      rating,
      message: message.trim(),
      email: userEmail.trim() || undefined,
      url: typeof window !== "undefined" ? window.location.href : pathname,
      pathname,
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      createdAt: new Date().toISOString(),
    };

    try {
      // Salva duravelmente no histórico local do usuário
      const existing = JSON.parse(
        localStorage.getItem("theosphere_feedbacks_sent") || "[]",
      );
      existing.push(feedbackPayload);
      localStorage.setItem(
        "theosphere_feedbacks_sent",
        JSON.stringify(existing),
      );

      // Simula envio para endpoint ou webhook de telemetria
      await new Promise((resolve) => setTimeout(resolve, 600));

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage("");
        setUserEmail("");
        setErrorMessage("");
        onClose();
      }, 2200);
    } catch {
      setErrorMessage("Não foi possível enviar seu relato. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-200"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar my-auto bg-[#0C1019] border border-white/10 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="feedback-modal-title"
                className="text-sm font-bold text-white tracking-wide"
              >
                Canal de Feedback & Beta
              </h3>
              <p className="text-[11px] text-gray-400">
                Sua avaliação molda o futuro do TheoSphere
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Fechar"
            aria-label="Fechar modal de feedback"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-white">
              Feedback Enviado com Sucesso!
            </h4>
            <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
              Obrigado por testar e contribuir para o aperfeiçoamento da
              plataforma exegética.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Seletor de Categoria */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory("sugestao")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  category === "sugestao"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sugestão de Recurso</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory("bug")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  category === "bug"
                    ? "bg-rose-600/20 border-rose-500 text-rose-200 shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-200"
                }`}
              >
                <Bug className="w-3.5 h-3.5 text-rose-400" />
                <span>Relatar Bug / Erro</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory("duvida")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  category === "duvida"
                    ? "bg-blue-600/20 border-blue-500 text-blue-200 shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-200"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Dúvida Teológica</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory("elogio")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  category === "elogio"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-200 shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-200"
                }`}
              >
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span>Experiência Geral</span>
              </button>
            </div>

            {/* Avaliação em Estrelas */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[11px] text-gray-400 font-medium">
                Como você avalia a sua experiência até agora?
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-gray-600 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        (hoverRating || rating) >= star
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Mensagem */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="feedback-comment"
                className="text-[11px] font-bold text-gray-400 uppercase tracking-wider"
              >
                Seu Comentário ou Observação
              </label>
              <textarea
                id="feedback-comment"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conte o que achou, o que funcionou bem ou o que pode melhorar..."
                rows={4}
                required
                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
              />
            </div>

            {/* E-mail opcional */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="feedback-contact-email"
                className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between"
              >
                <span>E-mail para Contato</span>
                <span className="text-[10px] text-gray-500 normal-case">
                  (Opcional)
                </span>
              </label>
              <input
                id="feedback-contact-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <p
                role="alert"
                className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-500/20 rounded-xl p-2.5 text-center font-medium"
              >
                {errorMessage}
              </p>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full mt-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-98 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando Feedback...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar ao Time de Desenvolvimento</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
