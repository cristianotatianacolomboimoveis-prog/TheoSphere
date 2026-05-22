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

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setLoading(true);

    const mockEmail =
      provider === "google"
        ? "google-user@theosphere.com"
        : "apple-user@theosphere.com";
    const mockPassword =
      provider === "google" ? "GoogleOAuthMock2026!" : "AppleOAuthMock2026!";

    try {
      // Tenta fazer login primeiro
      let result = await login(mockEmail, mockPassword);

      // Se o usuário não existir, realiza o cadastro automático (que já loga por padrão)
      if (!result.success) {
        result = await register(mockEmail, mockPassword);
      }

      setLoading(false);

      if (result.success) {
        onClose();
      } else {
        setError(
          result.error ||
            `Erro de autenticação com o ${provider === "google" ? "Google" : "Apple"}.`,
        );
      }
    } catch (err) {
      setLoading(false);
      setError(
        `Erro inesperado ao conectar com o ${provider === "google" ? "Google" : "Apple"}.`,
      );
    }
  };

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

        {/* Divider separator */}
        <div className="relative z-10 flex items-center gap-3 px-8 my-1">
          <div className="flex-grow h-[1px] bg-white/10"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            ou continue com
          </span>
          <div className="flex-grow h-[1px] bg-white/10"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="relative z-10 grid grid-cols-2 gap-3.5 px-8 mb-6 mt-4">
          {/* Google OAuth Button */}
          <button
            id="google-login-btn"
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("google")}
            className="flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 active:scale-[0.97] border border-white/10 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Custom SVG Google Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.24 1 3.2 3.73 1.24 7.73l3.87 3a7.18 7.18 0 0 1 6.89-5.69z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.46h6.46a5.52 5.52 0 0 1-2.4 3.63l3.72 2.89c2.18-2 3.71-4.96 3.71-8.62z"
              />
              <path
                fill="#FBBC05"
                d="M5.11 10.73A7.18 7.18 0 0 1 5 12c0 .43.04.86.11 1.27L1.24 16.27A11.94 11.94 0 0 1 0 12c0-1.54.29-3.01.81-4.36l4.3 3.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.72-2.89a7.15 7.15 0 0 1-10.9-4.01L1.47 16.27C3.47 20.27 7.51 23 12 23z"
              />
            </svg>
            <span>Google</span>
          </button>

          {/* Apple OAuth Button */}
          <button
            id="apple-login-btn"
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("apple")}
            className="flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 active:scale-[0.97] border border-white/10 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Custom SVG Apple Icon */}
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M17.05 13.02c.07-2.6 2.3-3.83 2.4-3.88-1.28-1.89-3.26-2.15-3.97-2.18-1.69-.17-3.3 1-4.16 1.01-.86 0-2.2-1-3.6-1-1.86.02-3.57 1.1-4.52 2.76-1.95 3.37-.5 8.32 1.34 11.02.89 1.3 1.94 2.76 3.32 2.71 1.33-.05 1.84-.85 3.44-.85 1.6 0 2.06.85 3.46.82 1.43-.03 2.37-1.31 3.25-2.55 1.02-1.44 1.44-2.84 1.46-2.91-.03-.01-2.82-1.08-2.86-4.42zM12.9 6.27c.75-.92 1.25-2.19 1.11-3.46-1.07.04-2.37.72-3.13 1.63-.69.81-1.25 2.08-1.1 3.3 1.2.09 2.47-.65 3.12-1.47z" />
            </svg>
            <span>Apple</span>
          </button>
        </div>

        <div className="relative z-10 p-6 bg-slate-950/60 border-t border-white/5 text-center text-[10px] text-slate-400 uppercase tracking-wider">
          Protegido por TheoSphere Security OS.
        </div>
      </div>
    </div>
  );
}
