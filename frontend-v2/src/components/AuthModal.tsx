"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, ShieldCheck, X, Loader2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    const result = isLogin
      ? await login(email, password)
      : await register(email, password);

    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Ocorreu um erro inesperado");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/holy_land_bg.png')" }}
    >
      {/* Dark overlay for beautiful readability and premium look across the whole page */}
      <div
        className="absolute inset-0 bg-slate-950/60 z-0 cursor-pointer"
        onClick={onClose}
      ></div>

      {/* Main glassmorphism card container */}
      <div className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/10 bg-slate-950/40 backdrop-blur-xl z-10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white hover:scale-110 transition-all duration-200 z-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header/Tabs */}
        <div className="relative z-10 flex border-b border-white/10 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`flex-1 py-4 text-sm font-semibold tracking-wider uppercase transition-all ${
              isLogin
                ? "text-sky-400 border-b-2 border-sky-400 bg-white/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`flex-1 py-4 text-sm font-semibold tracking-wider uppercase transition-all ${
              !isLogin
                ? "text-sky-400 border-b-2 border-sky-400 bg-white/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cadastro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white tracking-tight font-display mb-1.5">
              TheoSphere
            </h2>
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest leading-relaxed">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </p>
            <p className="text-[11px] text-slate-350 mt-2">
              {isLogin
                ? "Acesse o portal e sua jornada teológica com suas credenciais."
                : "Junte-se à elite da pesquisa teológica e exegética."}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-350 p-3.5 rounded-xl text-xs text-center font-medium leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block ml-1">
                E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-500"
                  placeholder="exemplo@theosphere.com"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-355 uppercase tracking-wider block ml-1">
                Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-500"
                  placeholder="••••••••"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1 animate-zoom-in">
                <label className="text-xs font-bold text-slate-350 uppercase tracking-wider block ml-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/40 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-500"
                    placeholder="••••••••"
                  />
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/10 hover:shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{isLogin ? "Entrar com E-mail" : "Criar Conta"}</span>
            )}
          </button>
        </form>

        {/* Login social removido no beta (QA 2026-07-14): os botões
            Google/Apple eram mocks que autenticavam todos os usuários na
            MESMA conta compartilhada — risco de privacidade. Reativar apenas
            com OAuth real (Supabase Auth / NextAuth). */}
        <div className="relative z-10 px-8 mb-6 mt-2 text-center text-[10px] text-slate-500 uppercase tracking-wider">
          Login com Google/Apple em breve
        </div>

        <div className="relative z-10 p-6 bg-slate-950/60 border-t border-white/5 text-center text-[10px] text-slate-400 uppercase tracking-wider">
          Ao continuar, você concorda com os{" "}
          <a href="/termos" className="underline hover:text-slate-200">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" className="underline hover:text-slate-200">
            Política de Privacidade
          </a>
          .
        </div>
      </div>
    </div>
  );
}
