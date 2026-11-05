"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  ArrowLeft,
  Zap,
  HelpCircle,
  Crown,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { THEOSPHERE_PLANS } from "@/data/plans";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const plans = [
    THEOSPHERE_PLANS.STARTER,
    THEOSPHERE_PLANS.PLUS,
    THEOSPHERE_PLANS.PRO,
    THEOSPHERE_PLANS.CHURCH,
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setWaitlistSuccess(false);
    setWaitlistEmail("");
    setCheckoutModalOpen(true);
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || !waitlistEmail.includes("@")) return;
    setWaitlistSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 selection:bg-indigo-500/30 font-sans">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[400px] -left-40 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Navigation */}
        <header className="flex items-center justify-between pb-8 border-b border-white/5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Voltar à Bancada de Trabalho</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Planos e Assinaturas</span>
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center pt-12 pb-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Investimento no seu ministério e{" "}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              estudo bíblico
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Estudo exegético no texto original, acervo teológico clássico e
            inteligência artificial contextual em português.
          </p>

          {/* Billing Interval Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-full bg-slate-900/80 border border-white/10 shadow-inner">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                !isYearly
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                isYearly
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Anual</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                2 Meses Grátis
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isPlus = plan.id === "PLUS";

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                  isPlus
                    ? "bg-gradient-to-b from-indigo-950/80 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 shadow-2xl shadow-amber-500/10 scale-100 lg:-translate-y-2"
                    : "bg-slate-900/60 border border-white/10 hover:border-white/20"
                }`}
              >
                {/* Highlight Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-[10px] font-bold tracking-wide uppercase px-3 py-1 rounded-full shadow-lg ${
                        isPlus
                          ? "bg-amber-400 text-slate-950 font-extrabold"
                          : "bg-indigo-600 text-white"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan Title & Tagline */}
                <div className="mt-2 mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {plan.name}
                    {isPlus && <Crown className="w-4 h-4 text-amber-400" />}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">
                    {plan.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-white/5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">
                      {isYearly ? (
                        <>
                          R${" "}
                          {(plan.priceYearly / 12).toFixed(2).replace(".", ",")}
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            /mês
                          </span>
                        </>
                      ) : (
                        <>
                          {plan.priceMonthlyFormatted}
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            /mês
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  {isYearly && plan.priceYearly > 0 && (
                    <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                      Faturado anualmente por R${" "}
                      {plan.priceYearly.toFixed(2).replace(".", ",")}
                    </p>
                  )}
                </div>

                {/* AI Quota Pill */}
                <div className="mb-6 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {plan.aiCreditsMonthly} Créditos de IA/mês
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Consultas contextuais com evidências
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-slate-300 leading-snug"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-lg ${
                    isPlus
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                  }`}
                >
                  Entrar na Lista de Espera
                </button>
              </div>
            );
          })}
        </div>

        {/* Free Plan Comparison Anchor */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400">
            Deseja apenas leitura bíblica básica sem limites?{" "}
            <Link
              href="/"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 font-medium"
            >
              Continue usando o plano Gratuito com 10 créditos de degustação.
            </Link>
          </p>
        </div>

        {/* FAQ Section */}
        <section className="mt-20 pt-12 border-t border-white/5 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-white mb-8 flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <span>Perguntas Frequentes</span>
          </h2>
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-1.5">
                Como funcionam os Créditos de IA?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cada consulta complexa enviada ao Copilot IA consome 1 crédito.
                Consultas repetidas ou resolvidas pelo acervo clássico da
                biblioteca não consomem seus créditos.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-1.5">
                O que acontece se eu gastar todos os meus créditos no mês?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                A leitura bíblica, o atlas 3D, suas anotações, a comparação de
                versões e as obras clássicas continuam disponíveis. Apenas
                perguntas adicionais para a IA aguardam a renovação do ciclo
                mensal.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-1.5">
                Quando as assinaturas estarão disponíveis?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                As assinaturas estão em fase de homologação. Ao cadastrar seu
                e-mail na lista de espera, você receberá um aviso assim que o
                processamento de pagamentos for homologado.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-1.5">
                Como funciona o plano Church para equipes?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                O plano Church permitirá vincular até 10 contas de pastores,
                presbíteros e professores da sua comunidade local,
                compartilhando uma cota de 1.500 créditos mensais de IA.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Waitlist Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Lista de Espera — {selectedPlan}</span>
            </h3>

            {waitlistSuccess ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Inscrição Confirmada!
                </h4>
                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  Seu e-mail foi adicionado à lista prioritária do plano{" "}
                  <strong className="text-white">
                    {THEOSPHERE_PLANS[selectedPlan || "STARTER"]?.name}
                  </strong>
                  . Notificaremos assim que as assinaturas forem ativadas.
                </p>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  As assinaturas ainda não estão disponíveis para contratação
                  imediata. Cadastre seu e-mail para receber acesso prioritário
                  ao plano{" "}
                  <strong className="text-white">
                    {THEOSPHERE_PLANS[selectedPlan || "STARTER"]?.name}
                  </strong>
                  :
                </p>

                <form
                  onSubmit={handleWaitlistSubmit}
                  className="space-y-4 mb-4"
                >
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="seu-email@exemplo.com"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Entrar na Lista de Espera
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
