"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = isLogin 
      ? await login(email, password)
      : await register(email, password);

    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Ocorreu um erro inesperado');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden glass-heavy animate-in fade-in zoom-in duration-300">
        
        {/* Header/Tabs */}
        <div className="flex border-b border-border-subtle">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-4 text-sm font-semibold transition-all ${isLogin ? 'text-primary border-b-2 border-primary' : 'text-foreground/50 hover:text-foreground/80'}`}
          >
            Entrar
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-4 text-sm font-semibold transition-all ${!isLogin ? 'text-primary border-b-2 border-primary' : 'text-foreground/50 hover:text-foreground/80'}`}
          >
            Cadastro
          </button>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-sm text-foreground/60 mt-2">
              {isLogin ? 'Acesse o TheoSphere PhD com suas credenciais.' : 'Junte-se à elite da pesquisa teológica.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground/50 uppercase tracking-wider mb-1.5 ml-1">E-mail</label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background/50 border border-border-subtle rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="exemplo@theosphere.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/50 uppercase tracking-wider mb-1.5 ml-1">Senha</label>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background/50 border border-border-subtle rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
              <span>{isLogin ? 'Entrar' : 'Registrar'}</span>
            )}
          </button>
        </form>

        <div className="p-6 bg-surface-hover/20 text-center text-xs text-foreground/50">
          Protegido por TheoSphere Security OS.
        </div>
      </div>
    </div>
  );
}
