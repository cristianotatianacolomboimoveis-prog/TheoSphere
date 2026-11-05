/**
 * plans.constants.ts — Definição canônica de planos e limites de IA do TheoSphere.
 * Baseado na proposta oficial de precificação em Real (BRL).
 */

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanDefinition {
  id: 'FREE' | 'STARTER' | 'PLUS' | 'PRO' | 'CHURCH';
  name: string;
  tagline: string;
  targetAudience: string;
  priceMonthly: number; // em reais
  priceYearly: number; // com desconto de 2 meses grátis
  priceMonthlyFormatted: string;
  priceYearlyFormatted: string;
  aiCreditsMonthly: number;
  highlight?: boolean;
  badge?: string;
  features: string[];
}

export const THEOSPHERE_PLANS: Record<string, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Gratuito',
    tagline: 'Degustação e Leitura Bíblica Livre',
    targetAudience:
      'Para novos usuários experimentarem as ferramentas essenciais.',
    priceMonthly: 0,
    priceYearly: 0,
    priceMonthlyFormatted: 'Grátis',
    priceYearlyFormatted: 'Grátis',
    aiCreditsMonthly: 10,
    features: [
      'Leitura integral das 7 Bíblias canônicas (BLIVRE, NVA, KJV, WEB, TR, WLC, LXX)',
      '108 Obras Clássicas e Teológicas completas (Domínio Público)',
      'Atlas Bíblico 3D com órbita 360° e relevo topográfico',
      '10 Créditos de IA iniciais no cadastro (degustação)',
      'Anotações e marcadores básicos de versículos',
    ],
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    tagline: 'Para estudantes e leitores assíduos da Bíblia',
    targetAudience:
      'Estudantes da Bíblia, membros de igreja e leitores devocionais.',
    priceMonthly: 14.9,
    priceYearly: 149.0, // 2 meses grátis
    priceMonthlyFormatted: 'R$ 14,90',
    priceYearlyFormatted: 'R$ 12,41/mês (R$ 149/ano)',
    aiCreditsMonthly: 60,
    badge: 'Iniciante',
    features: [
      'Tudo do plano Gratuito',
      '60 Créditos de IA por mês (~2 consultas diárias completas)',
      'Anotações ilimitadas e marca-texto temático de 5 cores teológicas',
      'Speed Search global (⌘K) com filtros avançados e operadores booleanos',
      'Guia de Passagem em 1 clique com 45.114 comentários exegéticos',
      'Acesso contínuo ao acervo e à Bíblia mesmo após atingir o limite de IA',
    ],
  },
  PLUS: {
    id: 'PLUS',
    name: 'Plus',
    tagline: 'Para pastores, líderes e professores de teologia',
    targetAudience:
      'Pastores, pregadores, professores de EBD e líderes ministeriais.',
    priceMonthly: 24.9,
    priceYearly: 249.0, // 2 meses grátis
    priceMonthlyFormatted: 'R$ 24,90',
    priceYearlyFormatted: 'R$ 20,75/mês (R$ 249/ano)',
    aiCreditsMonthly: 200,
    highlight: true,
    badge: 'Mais Popular • Recomendado para Pastores',
    features: [
      'Tudo do plano Starter',
      '200 Créditos de IA por mês (~7 consultas teológicas aprofundadas por dia)',
      'Pesquisa Teológica com Evidências e Citações diretas das 108 obras clássicas',
      'Assistente de Preparação de Sermões e Esboços Homiléticos',
      'Diretriz de Equilíbrio Hermenêutico (Perspectivas Reformada e Arminiana)',
      'Bancada Exegética Tríplice com sincronização automática (Link Set A)',
      'Suporte prioritário na comunidade TheoSphere',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    tagline: 'Para teólogos, pesquisadores e exégetas acadêmicos',
    targetAudience:
      'Teólogos, seminaristas avançados, autores e pesquisadores.',
    priceMonthly: 39.9,
    priceYearly: 399.0, // 2 meses grátis
    priceMonthlyFormatted: 'R$ 39,90',
    priceYearlyFormatted: 'R$ 33,25/mês (R$ 399/ano)',
    aiCreditsMonthly: 600,
    badge: 'Nível Acadêmico',
    features: [
      'Tudo do plano Plus',
      '600 Créditos de IA por mês (~20 consultas diárias com contexto estendido)',
      'Estudo Profundo de Palavras Originais em Grego e Hebraico (Strong, Morfologia e Sintaxe)',
      'Alinhamento Sinótico, Variantes Textuais e Diagramação Sintática',
      'Prioridade máxima e latência ultra-baixa com Gemini 3.8 Flash e failover OpenAI',
      'Exportação completa de fichas exegéticas e dossiês em Markdown',
      'Acesso antecipado a novas ferramentas do Theo Engine',
    ],
  },
  CHURCH: {
    id: 'CHURCH',
    name: 'Church / Institution',
    tagline: 'Para igrejas, seminários e equipes ministeriais',
    targetAudience:
      'Igrejas locais, departamentos teológicos, conselhos pastorais e seminários.',
    priceMonthly: 99.9,
    priceYearly: 999.0, // 2 meses grátis
    priceMonthlyFormatted: 'R$ 99,90',
    priceYearlyFormatted: 'R$ 83,25/mês (R$ 999/ano)',
    aiCreditsMonthly: 1500,
    badge: 'Equipes & Ministérios',
    features: [
      'Tudo do plano Pro',
      '1.500 Créditos de IA por mês compartilhados',
      'Gestão de múltiplos acessos (até 10 contas de pastores e líderes vinculadas)',
      'Painel ministerial unificado de acompanhamento e estudos',
      'Treinamento e onboarding para a liderança da igreja',
      'Canal de suporte e consultoria dedicada',
    ],
  },
};
