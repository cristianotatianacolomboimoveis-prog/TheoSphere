import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export const AuthPage: React.FC = () => {
  const { signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email format validation helper
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Form client-side validation
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Insira um endereço de e-mail válido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user && data.session) {
          // If auto-login or no email verification enabled
          setSuccess("Cadastro realizado com sucesso! Autenticando...");
          setTimeout(() => navigate("/dashboard"), 1500);
        } else {
          setSuccess("Cadastro efetuado! Verifique seu e-mail para confirmação.");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setIsSignUp(false);
        }
      } catch (err: any) {
        setError(err.message || "Erro ao realizar cadastro.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccess("Login efetuado com sucesso! Redirecionando...");
        setTimeout(() => navigate("/dashboard"), 1000);
      } catch (err: any) {
        setError(err.message || "Credenciais inválidas ou erro no servidor.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setSuccess(null);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      setError(err.message || `Erro ao entrar com ${provider}.`);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: "url('/holy_land_bg.png')" }}
    >
      {/* Dark overlay for beautiful legibility */}
      <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/60 z-0"></div>

      {/* Main glassmorphism card container */}
      <div className="glass-card w-full max-w-md rounded-3xl p-8 relative z-10 animate-fade-in flex flex-col justify-center">
        
        {/* Title / Logo Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 font-display">
            TheoSphere
          </h1>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-relaxed">
            Portal Teológico & Geográfico
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium leading-relaxed">
            {success}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email input field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Endereço de E-mail
            </label>
            <div className="relative">
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                disabled={loading}
                className="w-full bg-white/40 dark:bg-slate-950/40 border border-slate-300/40 dark:border-white/10 text-slate-950 dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Senha
            </label>
            <div className="relative">
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={loading}
                className="w-full bg-white/40 dark:bg-slate-950/40 border border-slate-300/40 dark:border-white/10 text-slate-950 dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Confirm Password (only on Sign Up mode) */}
          {isSignUp && (
            <div className="space-y-1 animate-zoom-in">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  id="confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  disabled={loading}
                  className="w-full bg-white/40 dark:bg-slate-950/40 border border-slate-300/40 dark:border-white/10 text-slate-950 dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? "Criar Conta" : "Entrar com E-mail"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider separator */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-grow h-[1px] bg-slate-300/35 dark:bg-white/10"></div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            ou continue com
          </span>
          <div className="flex-grow h-[1px] bg-slate-300/35 dark:bg-white/10"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3.5 mb-6">
          {/* Google OAuth Button */}
          <button
            id="google-login-btn"
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("google")}
            className="flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 active:scale-[0.97] border border-slate-300/40 dark:border-white/10 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 active:scale-[0.97] border border-slate-300/40 dark:border-white/10 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Custom SVG Apple Icon (respects light/dark colors) */}
            <svg className="w-4 h-4 fill-slate-800 dark:fill-white" viewBox="0 0 24 24">
              <path d="M17.05 13.02c.07-2.6 2.3-3.83 2.4-3.88-1.28-1.89-3.26-2.15-3.97-2.18-1.69-.17-3.3 1-4.16 1.01-.86 0-2.2-1-3.6-1-1.86.02-3.57 1.1-4.52 2.76-1.95 3.37-.5 8.32 1.34 11.02.89 1.3 1.94 2.76 3.32 2.71 1.33-.05 1.84-.85 3.44-.85 1.6 0 2.06.85 3.46.82 1.43-.03 2.37-1.31 3.25-2.55 1.02-1.44 1.44-2.84 1.46-2.91-.03-.01-2.82-1.08-2.86-4.42zM12.9 6.27c.75-.92 1.25-2.19 1.11-3.46-1.07.04-2.37.72-3.13 1.63-.69.81-1.25 2.08-1.1 3.3 1.2.09 2.47-.65 3.12-1.47z" />
            </svg>
            <span>Apple</span>
          </button>
        </div>

        {/* Footer switch prompt */}
        <div className="text-center">
          <button
            id="auth-mode-toggle"
            type="button"
            disabled={loading}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            className="text-xs font-semibold text-slate-800 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 hover:underline transition-all cursor-pointer"
          >
            {isSignUp ? (
              <span>Já possui uma conta? Faça Login</span>
            ) : (
              <span>Não tem uma conta? Cadastre-se</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
