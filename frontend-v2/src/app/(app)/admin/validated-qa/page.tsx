"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

/**
 * Painel de moderação das Q&A validadas (aprendizado contínuo).
 * Acesso restrito: o backend exige role ADMIN ou MODERATOR — usuários sem
 * permissão recebem a tela de acesso negado (401/403).
 */

interface ValidatedQaItem {
  id: string;
  query: string;
  answer: string;
  status: "active" | "pending";
  votes: number;
  validatedAt: string;
}

interface ListResponse {
  success: boolean;
  data: {
    items: ValidatedQaItem[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export default function ValidatedQaAdminPage() {
  const [items, setItems] = useState<ValidatedQaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await api.get<ListResponse>(`rag/validated-qa?page=${p}`, {
        withAuth: true,
      });
      if (res.success) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setPage(res.data.page);
        setPageSize(res.data.pageSize);
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setForbidden(true);
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Deferido para respeitar a regra react-hooks/set-state-in-effect
  // (mesmo padrão do ReadingPlanWidget)
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load(1);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm("Remover esta resposta validada permanentemente?"))
      return;
    setDeleting(id);
    try {
      await api.delete(`rag/validated-qa/${id}`, { withAuth: true });
      await load(page);
    } catch (err) {
      console.error("Falha ao remover:", err);
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (forbidden) {
    return (
      <div className="flex-grow flex items-center justify-center bg-[#F3F4F6] dark:bg-[#05080F] p-8">
        <div className="text-center space-y-3">
          <Lock className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto" />
          <h1 className="text-lg font-bold text-gray-700 dark:text-white/80">
            Acesso restrito
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/40 max-w-sm">
            Este painel de moderação exige perfil de administrador ou
            moderador. Faça login com uma conta autorizada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#F3F4F6] dark:bg-[#05080F] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-end justify-between border-b border-gray-300 dark:border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                Moderação
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">
              Respostas Validadas do TheoAI
            </h1>
            <p className="text-sm text-gray-500 dark:text-white/40 mt-1">
              {total} entrada{total === 1 ? "" : "s"} na coleção de aprendizado
              contínuo
            </p>
          </div>
          <button
            onClick={() => void load(page)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-white/30 text-center py-16">
            Nenhuma resposta validada ainda. Elas surgem quando usuários
            avaliam respostas do TheoAI com 👍.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                          item.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        {item.status === "active" ? "Ativa" : "Pendente"}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {item.votes} voto{item.votes === 1 ? "" : "s"} ·{" "}
                        {new Date(item.validatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 truncate">
                      {item.query}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-white/40 mt-1 line-clamp-2">
                      {item.answer}
                    </p>
                  </div>
                  <button
                    onClick={() => void remove(item.id)}
                    disabled={deleting === item.id}
                    aria-label="Remover resposta validada"
                    title="Remover permanentemente"
                    className="p-2 rounded-lg text-gray-300 dark:text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    {deleting === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => void load(page - 1)}
                  disabled={page <= 1}
                  aria-label="Página anterior"
                  className="p-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 disabled:opacity-30 hover:border-blue-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-500 dark:text-white/50">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => void load(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Próxima página"
                  className="p-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 disabled:opacity-30 hover:border-blue-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
