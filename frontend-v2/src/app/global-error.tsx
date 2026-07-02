"use client";

import React from "react";

export const dynamic = "force-dynamic";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 font-sans text-white">
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-500 w-8 h-8"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="text-xl font-black uppercase tracking-widest mb-2">
            Falha no Núcleo do Sistema
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            Ocorreu um erro crítico global. O sistema operacional TheoSphere
            precisou ser interrompido temporariamente.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-slate-800 rounded-2xl text-xs font-bold text-white transition-all cursor-pointer"
          >
            Tentar reiniciar
          </button>
        </div>
      </body>
    </html>
  );
}
