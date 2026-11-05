"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Zap,
  HelpCircle,
  QrCode,
  CreditCard,
  Crown,
  BookOpen,
} from "lucide-react";
import { THEOSPHERE_PLANS, PlanDefinition } from "@/data/plans";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const plans = [
    THEOSPHERE_PLANS.STARTER,
    THEOSPHERE_PLANS.PLUS,
    THEOSPHERE_PLANS.PRO,
    THEOSPHERE_PLANS.CHURCH,
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setCheckoutModalOpen(true);
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
            <span>Planos Oficiais TheoSphere</span>
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
            Uma fração do custo do Logos Bible Software, com exegese original,
            108 obras teológicas completas e inteligência artificial soberana em
            português.
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

        {/* Free Tier Guarantee Banner */}
        <div className="mb-10 max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-emerald-950/40 border border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Garantia de Leitura Livre Perpétua
              </h4>
              <p className="text-xs text-slate-300">
                A Bíblia, o Atlas 3D e as 108 obras clássicas são 100% livres e
                gratuitas para sempre, mesmo se a sua cota de IA terminar.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            Gratuito p/ Sempre
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan: PlanDefinition) => {
            const price = isYearly
              ? plan.priceYearlyFormatted
              : plan.priceMonthlyFormatted;
            const isPlus = plan.id === "PLUS";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                  isPlus
                    ? "bg-slate-900/90 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 scale-102 lg:-translate-y-2"
                    : "bg-slate-900/50 border border-white/10 hover:border-white/20 hover:bg-slate-900/70"
                }`}
              >
                {/* Badge if available */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-[11px] font-bold tracking-wide uppercase px-3 py-1 rounded-full border shadow-sm ${
                        isPlus
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-300"
                          : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
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
                      RAG com citações e evidências
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
                  Assinar Plano {plan.name}
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
              Continue usando o plano Gratuito com 10 créditos iniciais.
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
                Consultas repetidas ou já respondidas pelo acervo clássico da
                biblioteca não gastam seus créditos.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-1.5">
                O que acontece se eu gastar todos os meus créditos no mês?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você nunca fica na mão. A leitura bíblica, o atlas 3D, suas
                anotações, a comparação de versões e as 108 obras clássicas
                continuam 100% ilimitadas. Apenas novas perguntas para a IA
                aguardam o ciclo mensal ou upgrade.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-1.5">
                Quais são as formas de pagamento disponíveis?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aceitamos PIX instantâneo e Cartão de Crédito nacional em até
                12x no plano anual, sem necessidade de cartão internacional ou
                cobrança de IOF.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
              <h4 className="text-sm font-semibold text-white mb-1.5">
                Como funciona o plano Church para equipes?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                O plano Church permite vincular até 10 contas de pastores,
                presbíteros e professores da sua comunidade local,
                compartilhando uma cota robusta de 1.500 créditos mensais de IA.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Checkout Modal / Feedback de Assinatura */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Assinatura TheoSphere {selectedPlan}</span>
            </h3>
            <p className="text-xs text-slate-300 mb-6">
              Você selecionou o plano{" "}
              <strong className="text-white">
                {THEOSPHERE_PLANS[selectedPlan || "STARTER"]?.name}
              </strong>
              . Escolha a forma de pagamento preferida:
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => {
                  alert(
                    "Integração PIX ativa! O QR Code dinâmico será gerado na confirmação.",
                  );
                  setCheckoutModalOpen(false);
                }}
                className="w-full p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      PIX Instantâneo
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      Liberação imediata sem taxa
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">
                  {isYearly
                    ? THEOSPHERE_PLANS[selectedPlan || "STARTER"]
                        ?.priceYearlyFormatted
                    : THEOSPHERE_PLANS[selectedPlan || "STARTER"]
                        ?.priceMonthlyFormatted}
                </span>
              </button>

              <button
                onClick={() => {
                  alert("Integração com Cartão de Crédito iniciada!");
                  setCheckoutModalOpen(false);
                }}
                className="w-full p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Cartão de Crédito
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Recorrente mensal ou até 12x no anual
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">
                  {isYearly
                    ? THEOSPHERE_PLANS[selectedPlan || "STARTER"]
                        ?.priceYearlyFormatted
                    : THEOSPHERE_PLANS[selectedPlan || "STARTER"]
                        ?.priceMonthlyFormatted}
                </span>
              </button>
            </div>

            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
