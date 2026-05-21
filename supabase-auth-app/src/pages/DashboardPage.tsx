import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut, Globe, Shield, Calendar, User, Loader2 } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error("Erro ao deslogar:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  // Humanize sign-in timestamp helper
  const formatSignInTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: "url('/holy_land_bg.png')" }}
    >
      {/* Dark overlay for beautiful legibility */}
      <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/60 z-0"></div>

      {/* Main glassmorphism card container */}
      <div className="glass-card w-full max-w-2xl rounded-3xl p-8 relative z-10 animate-fade-in shadow-2xl">
        
        {/* Header with Icon */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-300/40 dark:border-white/10 pb-6 mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1 font-display">
              Painel de Controle
            </h1>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-relaxed">
              TheoSphere OS • Área Privada
            </p>
          </div>
          
          <button
            id="logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 py-2.5 px-5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Encerrar Sessão</span>
              </>
            )}
          </button>
        </div>

        {/* Content body */}
        <div className="space-y-6">
          {/* Welcome Card */}
          <div className="bg-white/30 dark:bg-slate-900/45 border border-slate-300/35 dark:border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3.5 mb-2">
              <User className="w-8 h-8 text-sky-500" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Bem-vindo de volta!
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                  Sessão ativa e segura
                </p>
              </div>
            </div>
            
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-all mt-4">
              Identificado como: <span className="font-mono text-sky-600 dark:text-sky-400">{user?.email}</span>
            </p>
          </div>

          {/* Stats details section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Box 1 */}
            <div className="bg-white/20 dark:bg-slate-900/30 border border-slate-300/20 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
              <Shield className="w-6 h-6 text-emerald-500 mb-2" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                Provedor Auth
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                {user?.app_metadata?.provider || "E-mail"}
              </span>
            </div>

            {/* Box 2 */}
            <div className="bg-white/20 dark:bg-slate-900/30 border border-slate-300/20 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
              <Calendar className="w-6 h-6 text-sky-500 mb-2" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                Último Acesso
              </span>
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                {formatSignInTime(user?.last_sign_in_at)}
              </span>
            </div>

            {/* Box 3 */}
            <div className="bg-white/20 dark:bg-slate-900/30 border border-slate-300/20 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
              <Globe className="w-6 h-6 text-amber-500 mb-2" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                Geocontexto
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Ativo (Jerusalém)
              </span>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-300/30 dark:border-white/5 text-center">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            TheoSphere OS v1.0.0 • Proteção Criptográfica Ativa
          </p>
        </div>

      </div>
    </div>
  );
};
