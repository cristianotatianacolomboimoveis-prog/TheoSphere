"use client";

import React, { useState, useEffect } from "react";
import {
  X, Plus, Trash2, BookOpen, Save, Copy, ArrowLeft, Check, Sparkles, Users, FileText, HelpCircle, Link2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./Toast";

interface StudyPlan {
  id: string;
  title: string;
  passage: string;
  questions: string[];
  leaderNotes: string;
  additionalRefs: string[];
  createdAt: number;
}

/* ─── Question Generator (mock) ──────────────────────────── */

const QUESTION_TEMPLATES: Record<string, string[]> = {
  default: [
    "Qual é a ideia principal desta passagem?",
    "O que esta passagem nos revela sobre o caráter de Deus?",
    "Quais são os comandos, promessas ou advertências neste texto?",
    "Como esta passagem se conecta com a mensagem geral da Bíblia?",
    "Como você pode aplicar esta verdade na sua vida esta semana?",
    "O que o contexto histórico nos ajuda a entender sobre esta passagem?",
    "Existe alguma palavra ou frase que chama sua atenção? Por quê?",
  ],
  old_testament: [
    "Como esta passagem do AT aponta para Cristo?",
    "Que princípio eterno podemos extrair desta narrativa?",
    "Qual era a situação do povo de Israel neste momento?",
    "Como esta passagem se relaciona com a aliança de Deus?",
    "Que lições sobre fidelidade e obediência encontramos aqui?",
  ],
  epistles: [
    "Qual problema na igreja o autor está abordando?",
    "Quais são as implicações teológicas deste texto?",
    "Como este ensino se aplica à igreja contemporânea?",
    "Que virtudes cristãs são enfatizadas nesta passagem?",
    "Como esta verdade deve transformar nosso relacionamento com outros crentes?",
  ],
  gospels: [
    "O que Jesus está ensinando nesta passagem?",
    "Como os discípulos e a multidão reagiram?",
    "Que aspecto do Reino de Deus é revelado aqui?",
    "Como esta passagem desafia nossas pressuposições?",
    "O que podemos aprender sobre o caráter de Jesus neste evento?",
  ],
};

function generateQuestions(passage: string): string[] {
  const lower = passage.toLowerCase();
  let templateKey = "default";
  if (lower.includes("genesis") || lower.includes("exodus") || lower.includes("psalm") ||
      lower.includes("isaiah") || lower.includes("jeremiah")) {
    templateKey = "old_testament";
  } else if (lower.includes("matthew") || lower.includes("mark") ||
             lower.includes("luke") || lower.includes("john ")) {
    templateKey = "gospels";
  } else if (lower.includes("romans") || lower.includes("corinthians") ||
             lower.includes("galatians") || lower.includes("ephesians") ||
             lower.includes("philippians") || lower.includes("colossians")) {
    templateKey = "epistles";
  }

  const questions = [...QUESTION_TEMPLATES[templateKey]];
  // Mix in some default questions
  if (templateKey !== "default") {
    questions.push(...QUESTION_TEMPLATES.default.slice(0, 3));
  }
  return questions.slice(0, 7);
}

/* ─── Component ──────────────────────────────────────────── */

export default function StudyBuilder({ onClose }: { onClose: () => void }) {
  const [studies, setStudies] = useState<StudyPlan[]>([]);
  const [view, setView] = useState<"list" | "editor" | "new">("list");
  const [currentStudy, setCurrentStudy] = useState<StudyPlan | null>(null);
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [leaderNotes, setLeaderNotes] = useState("");
  const [additionalRefs, setAdditionalRefs] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    const savedStudies = localStorage.getItem('theosphere-studies');
    if (savedStudies) {
      try { setStudies(JSON.parse(savedStudies)); } catch (e) {}
    }
  }, []);

  const createStudy = () => {
    if (!title.trim() || !passage.trim()) return;
    const generatedQuestions = generateQuestions(passage);
    const newStudy: StudyPlan = {
      id: Date.now().toString(),
      title,
      passage,
      questions: generatedQuestions,
      leaderNotes: "",
      additionalRefs: [],
      createdAt: Date.now()
    };
    
    const updated = [newStudy, ...studies];
    setStudies(updated);
    localStorage.setItem('theosphere-studies', JSON.stringify(updated));
    setCurrentStudy(newStudy);
    setQuestions(generatedQuestions);
    setLeaderNotes("");
    setAdditionalRefs([]);
    setView("editor");
    show("Estudo gerado!", "success");
  };

  const openStudy = (study: StudyPlan) => {
    setCurrentStudy(study);
    setTitle(study.title);
    setPassage(study.passage);
    setQuestions(study.questions);
    setLeaderNotes(study.leaderNotes || "");
    setAdditionalRefs(study.additionalRefs || []);
    setView("editor");
  };

  const saveStudy = () => {
    if (!currentStudy) return;
    const updatedStudy = { ...currentStudy, title, passage, questions, leaderNotes, additionalRefs };
    const updatedList = studies.map(s => s.id === currentStudy.id ? updatedStudy : s);
    setStudies(updatedList);
    localStorage.setItem('theosphere-studies', JSON.stringify(updatedList));
    setSaved(true);
    show("Estudo salvo", "success");
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteStudy = (id: string) => {
    if (!confirm("Excluir este estudo?")) return;
    const updated = studies.filter(s => s.id !== id);
    setStudies(updated);
    localStorage.setItem('theosphere-studies', JSON.stringify(updated));
    show("Estudo removido", "info");
  };

  const copyStudyLink = () => {
    const studyData = { title, passage, questions, leaderNotes, additionalRefs };
    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(studyData))));
    const url = `${window.location.origin}?study=${base64}`;
    navigator.clipboard.writeText(url);
    show("Link de compartilhamento copiado!", "success");
  };

  return (
    <div className="flex flex-col h-full bg-[#070b14] text-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          {view !== "list" ? (
            <button onClick={() => setView("list")} className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Meus Estudos</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Users className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">Study Builder</h2>
                <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase">Estudo Bíblico</p>
              </div>
            </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar px-5 py-4">
        <AnimatePresence mode="wait">
          {view === "list" && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                onClick={() => { setView("new"); setTitle(""); setPassage(""); }}
                className="w-full btn-primary flex items-center justify-center gap-2 mb-4"
              >
                <Plus className="w-4 h-4" /> Novo Estudo Bíblico
              </button>

              {studies.length > 0 ? (
                <div className="space-y-1.5">
                  {studies.sort((a, b) => b.createdAt - a.createdAt).map((study) => (
                    <button
                      key={study.id}
                      onClick={() => openStudy(study)}
                      className="w-full text-left p-4 rounded-xl bg-white/[0.02] border border-white/[0.03] card-interactive group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[13px] font-semibold text-white/80 group-hover:text-cyan-400 transition-colors">{study.title}</h4>
                          <p className="text-[10px] text-white/25 mt-0.5">{study.passage} · {study.questions.length} perguntas</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteStudy(study.id); }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/20">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Nenhum estudo ainda</p>
                  <p className="text-xs mt-1 text-white/10">Crie um estudo para seu grupo</p>
                </div>
              )}
            </motion.div>
          )}

          {view === "new" && (
            <motion.div key="new" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <h3 className="text-sm font-bold text-white/60 mb-4">Novo Estudo Bíblico</h3>
              <div className="space-y-3">
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do estudo..."
                  className="input-glass w-full text-sm"
                />
                <input
                  type="text" value={passage} onChange={(e) => setPassage(e.target.value)}
                  placeholder="Passagem base (ex: Philippians 4:1-9)"
                  className="input-glass w-full text-sm"
                />
                <div className="glass-amber rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-bold text-amber-500">Geração Automática</p>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    O TheoSphere irá gerar automaticamente perguntas de discussão contextualizadas para a passagem escolhida (AT, Evangelhos, Epístolas, etc.)
                  </p>
                </div>
                <button
                  onClick={createStudy}
                  disabled={!title.trim() || !passage.trim()}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Gerar Estudo
                </button>
              </div>
            </motion.div>
          )}

          {view === "editor" && currentStudy && (
            <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-lg font-bold text-white outline-none border-b border-white/5 pb-2 mb-1 focus:border-cyan-500/30"
              />
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400/40" />
                <input
                  type="text" value={passage} onChange={(e) => setPassage(e.target.value)}
                  className="bg-transparent text-sm text-cyan-400/80 outline-none"
                />
              </div>

              {/* Questions */}
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3" /> Perguntas para Discussão
                </h4>
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs font-bold text-cyan-500/50 mt-2.5 w-5 text-right flex-shrink-0">{i + 1}.</span>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[i] = e.target.value;
                          setQuestions(updated);
                        }}
                        className="input-glass flex-grow text-xs"
                      />
                      <button
                        onClick={() => setQuestions(prev => prev.filter((_, j) => j !== i))}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/15 hover:text-red-400 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setQuestions(prev => [...prev, ""])}
                    className="w-full py-2 rounded-lg border border-dashed border-white/10 hover:border-cyan-500/30 text-white/20 hover:text-cyan-400 text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Pergunta
                  </button>
                </div>
              </div>

              {/* Leader Notes */}
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Notas do Líder</h4>
                <textarea
                  value={leaderNotes}
                  onChange={(e) => setLeaderNotes(e.target.value)}
                  placeholder="Insights, contexto e direções para a discussão..."
                  className="input-glass w-full h-24 text-xs resize-none"
                />
              </div>

              {/* Additional References */}
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Referências Adicionais</h4>
                <input
                  type="text"
                  value={additionalRefs.join(", ")}
                  onChange={(e) => setAdditionalRefs(e.target.value.split(",").map(v => v.trim()).filter(Boolean))}
                  placeholder="Ex: Romans 8:28, James 1:2-4, Hebrews 12:1"
                  className="input-glass w-full text-xs font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={saveStudy} className="flex-1 btn-primary flex items-center justify-center gap-1.5">
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Salvo!" : "Salvar"}
                </button>
                <button onClick={copyStudyLink} className="btn-ghost flex items-center gap-1.5 px-4">
                  <Link2 className="w-4 h-4" /> Link
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-2.5 border-t border-white/5 flex-shrink-0">
        <p className="text-[9px] text-white/12 text-center uppercase tracking-[0.15em] font-bold">
          Study Builder · TheoSphere OS
        </p>
      </div>
    </div>
  );
}
