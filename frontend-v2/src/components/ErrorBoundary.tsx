"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TheoSphere Critical Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 animate-pulse">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-widest mb-2">
            Interrupção de Sistema
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            Ocorreu uma falha crítica no núcleo do TheoSphere OS. 
            Nossos agentes de recuperação foram notificados.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-border-strong rounded-2xl text-xs font-bold text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reiniciar Núcleo
          </button>
          
          <div className="mt-12 p-4 bg-black/40 rounded-xl border border-border-subtle text-left max-w-2xl overflow-auto max-h-40">
             <pre className="text-[10px] font-mono text-red-400/60 leading-tight">
               {this.state.error?.stack}
             </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
