"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Globe2,
  Library,
  Compass,
  CheckCircle2,
  Loader2,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Página de Login no padrão Kenlo Imob adaptada para o TheoSphere Dark Tech SaaS.
 * Layout Split-Screen de alta conversão:
 *  - Painel Esquerdo (55%): Vitrine Institucional Teológica AI-First com cards de métricas
 *  - Painel Direito (45%): Formulário de Autenticação moderno e ergonômico
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Redireciona se já estiver autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const result = isLogin
        ? await login(email, password)
        : await register(email, password);

      setLoading(false);

      if (result.success) {
        if (!isLogin) {
          setSuccessMsg("Conta criada com sucesso! Redirecionando...");
          setTimeout(() => router.replace("/"), 1200);
        } else {
          router.replace("/");
        }
      } else {
        setError(
          result.error ||
            "Credenciais inválidas. Verifique seu e-mail e senha.",
        );
      }
    } catch (err: any) {
      setLoading(false);
      setError(
        err?.message || "Erro ao conectar com o servidor. Tente novamente.",
      );
    }
  };

  const handleGuestAccess = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#080B11] text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* ─── PAINEL ESQUERDO: Vitrine Teológica & Brand Kenlo-Grade (55%) ─── */}
      <div className="relative hidden lg:flex lg:w-[54%] xl:w-[56%] flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-white/5 bg-radial from-[#131B2E] via-[#090D17] to-[#06090F]">
        {/* Glows e Efeitos de Fundo Kenlo Dark Tech */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Linhas de grade sutil em perspectiva estilo SaaS */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Topo do Painel: Marca e Badge */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/25 border border-white/10">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-display">
                  TheoSphere
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  AI-First v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Bancada de Pesquisa Bíblica, Exegese & IA Contextual
              </p>
            </div>
          </div>

          {/* Headline Principal */}
          <div className="max-w-xl mt-6">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.18] font-display">
              A profundidade da exegese clássica com a velocidade da
              inteligência moderna.
            </h1>
            <p className="text-sm xl:text-base text-slate-350 mt-4 leading-relaxed font-normal">
              Projetado para pastores, teólogos e pesquisadores que exigem
              precisão aos manuscritos originais em grego e hebraico e resposta
              em milissegundos.
            </p>
          </div>
        </div>

        {/* Centro: Cards de Indicadores e Capacidades no padrão Kenlo CRM/SaaS */}
        <div className="relative z-10 grid grid-cols-1 gap-3.5 max-w-xl my-8">
          {/* Card 1: Acervo Clássico */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  89 Obras Teológicas Canônicas
                </h2>
                <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  45.092 Chunks
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                João Calvino, Matthew Henry completo, Tomás de Aquino (Suma),
                Martinho Lutero, Agostinho e John Bunyan indexados para consulta
                instantânea.
              </p>
            </div>
          </div>

          {/* Card 2: Busca Híbrida e IA RAG */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Copilot Exegético RAG & Embeddings
                </h2>
                <span className="text-[10px] font-bold text-blue-400/90 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Equilíbrio Ecumênico
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Respostas teológicas ancoradas em fontes primárias, com
                imparcialidade entre tradições Reformada e Wesleyana e citações
                com número exato de página.
              </p>
            </div>
          </div>

          {/* Card 3: Atlas 3D com Órbita */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Atlas Bíblico 3D com Tour 360°
                </h2>
                <span className="text-[10px] font-bold text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Cesium Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Relevo topográfico do Monte Sinai, Cafarnaum e Jerusalém em
                primeira pessoa e mapeamento de rotas históricas dos Patriarcas
                aos Apóstolos.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé da Vitrine */}
        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Infraestrutura em Nuvem Operante</span>
          </div>
          <span className="italic font-serif text-slate-400">
            Ad Fontes — O retorno às fontes originais
          </span>
        </div>
      </div>

      {/* ─── PAINEL DIREITO: Formulário de Autenticação Kenlo-Style (45%) ─── */}
      <div className="w-full lg:w-[46%] xl:w-[44%] flex flex-col justify-between p-6 sm:p-10 xl:p-14 bg-[#0A0E17] relative">
        {/* Mobile Brand Header */}
        <div className="flex lg:hidden items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white font-display">
              TheoSphere
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            v2.0
          </span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-4">
          {/* Alternador Segmentado Kenlo (Pill Switcher) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-8">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                isLogin
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Entrar na Conta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                !isLogin
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Criar Nova Conta</span>
            </button>
          </div>

          {/* Cabeçalho do Formulário */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
              {isLogin
                ? "Bem-vindo à sua bancada"
                : "Junte-se à pesquisa teológica"}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {isLogin
                ? "Informe suas credenciais para sincronizar seu histórico, notas e preferências."
                : "Cadastre-se gratuitamente para acessar o acervo de 89 obras e o assistente de exegese."}
            </p>
          </div>

          {/* Alertas de Erro ou Sucesso */}
          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
              <span className="shrink-0 font-bold">⚠️</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulário Principal */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                E-mail corporativo ou pessoal
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@exemplo.com"
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/80 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 block">
                  Senha de acesso
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        "Para recuperar sua senha, entre em contato com o administrador.",
                      )
                    }
                    className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/80 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Senha (Modo Cadastro) */}
            {!isLogin && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-slate-300 block">
                  Confirmação da Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/80 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Checkbox Lembrar de Mim */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-slate-900 text-blue-600 focus:ring-blue-500/40"
                />
                <span className="text-xs text-slate-400">
                  Manter sessão conectada por 30 dias
                </span>
              </label>
            </div>

            {/* Botão Principal de Submissão estilo Kenlo */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {isLogin ? "Autenticando..." : "Criando sua conta..."}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {isLogin ? "Acessar Plataforma" : "Concluir Cadastro"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divisor "Ou" */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="absolute px-3 bg-[#0A0E17] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Ou explore agora
            </span>
          </div>

          {/* Botão de Convidado / Modo Visitante (Zero fricção) */}
          <button
            type="button"
            onClick={handleGuestAccess}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Acessar no Modo Visitante (Sem Cadastro)</span>
          </button>
        </div>

        {/* Rodapé Institucional */}
        <div className="pt-6 border-t border-white/5 text-center text-[11px] text-slate-400 space-y-2">
          <p>
            Ao continuar, você concorda com nossos{" "}
            <Link
              href="/termos"
              className="text-slate-350 hover:text-white underline"
            >
              Termos de Uso
            </Link>{" "}
            e{" "}
            <Link
              href="/privacidade"
              className="text-slate-350 hover:text-white underline"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <p className="text-[10px] text-slate-400">
            TheoSphere 2026 &copy; Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
