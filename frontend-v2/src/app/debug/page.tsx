"use client";

export default function DebugPage() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-20 text-center">
      <h1 className="text-4xl font-bold mb-4 text-amber-500">THEOSPHERE DEBUG MODE</h1>
      <p className="text-xl mb-8">Se você está vendo esta página, o Next.js e o Roteamento estão FUNCIONANDO.</p>
      <div className="grid grid-cols-2 gap-4 text-left">
        <div className="p-4 border border-white/20 rounded">
          <h2 className="font-bold text-emerald-500">Ambiente</h2>
          <pre className="text-xs mt-2">
            OS: MacOS (Local)
            Next.js: 16.2.5
            React: 19.2.6
          </pre>
        </div>
        <div className="p-4 border border-white/20 rounded">
          <h2 className="font-bold text-blue-500">Store Status</h2>
          <p className="text-xs mt-2">Zustand initialized: OK</p>
        </div>
      </div>
      <button 
        onClick={() => window.location.href = '/'}
        className="mt-10 px-6 py-2 bg-amber-600 rounded-full font-bold hover:bg-amber-500 transition-colors"
      >
        Voltar para a Home
      </button>
    </div>
  );
}
