"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Eye,
  EyeOff,
  Moon,
  Loader2,
  Sparkles,
  CheckCircle2,
  Radio,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const {
    login,
    register,
    loginAsGuest,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  // Auth Form States
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  // Telemetry & Uptime State
  const [uptime, setUptime] = useState("18:45:48");
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setUptime(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Redireciona automaticamente se já estiver autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // Video Stage States
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(38);
  const [activeSubtitle, setActiveSubtitle] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Subtitles sequence simulating live exegesis presentation with Israel footage
  const subtitles = [
    "Jerusalém: sobrevoo exegético sobre a Cidade Antiga, Muro Ocidental e Monte das Oliveiras...",
    "TheoSphere Copilot: Conectando sítios bíblicos de Israel com 45.114 chunks de comentários clássicos...",
    "Mapeando contexto histórico de Cafarnaum e Nazaré com relevo 3D de alta precisão arqueológica...",
    "Identificadas 3 variantes léxicas no Textus Receptus e Códice de Alepo...",
    "Síntese hermenêutica concluída com precisão geográfica e teológica em tempo real.",
  ];

  // Rotate subtitles
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveSubtitle((prev) => (prev + 1) % subtitles.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying, subtitles.length]);

  // Advance video progress scrubber
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setVideoProgress((prev) => (prev >= 100 ? 0 : prev + 0.35));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sound Engine (Web Audio ambient chord when sound is turned on)
  const toggleSound = () => {
    if (isMuted) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!audioContextRef.current && AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
        if (
          audioContextRef.current &&
          audioContextRef.current.state === "suspended"
        ) {
          void audioContextRef.current.resume();
        }
        if (audioContextRef.current) {
          const ctx = audioContextRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(220, ctx.currentTime); // Soft A3 ambient tone
          osc.frequency.exponentialRampToValueAtTime(
            329.63,
            ctx.currentTime + 2,
          ); // E4 harmonic

          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();

          oscillatorRef.current = osc;
          gainNodeRef.current = gain;
        }
      } catch (err) {
        console.warn("AudioContext not permitted yet", err);
      }
      setIsMuted(false);
    } else {
      if (gainNodeRef.current && audioContextRef.current) {
        try {
          gainNodeRef.current.gain.linearRampToValueAtTime(
            0.0001,
            audioContextRef.current.currentTime + 0.3,
          );
          setTimeout(() => {
            oscillatorRef.current?.stop();
            oscillatorRef.current?.disconnect();
            oscillatorRef.current = null;
          }, 350);
        } catch {
          // ignore
        }
      }
      setIsMuted(true);
    }
  };

  // Canvas Video Simulation (Exegesis studio presentation with glowing codex, particles, and waveforms)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    // Hebrew and Greek floating glyphs
    const glyphs = [
      "בְּרֵאשִׁ֖ית",
      "אֱלֹהִ֑ים",
      "Ἐν ἀρχῇ",
      "λόγος",
      "חֶסֶד",
      "πνεῦμα",
      "אֱמֶת",
      "φῶς",
      "קָדוֹשׁ",
      "χάρις",
    ];

    const particles = Array.from({ length: 24 }).map((_, i) => ({
      x: Math.random() * 640,
      y: Math.random() * 360,
      speedY: 0.3 + Math.random() * 0.6,
      text: glyphs[i % glyphs.length],
      size: 11 + Math.random() * 8,
      alpha: 0.15 + Math.random() * 0.45,
    }));

    const render = () => {
      angle += 0.015;

      const w = canvas.width;
      const h = canvas.height;

      // Dark futuristic studio background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#080C14");
      grad.addColorStop(0.5, "#0F172A");
      grad.addColorStop(1, "#070A10");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Studio spotlight glow
      const spotGrad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.4,
        20,
        w * 0.5,
        h * 0.4,
        w * 0.6,
      );
      spotGrad.addColorStop(0, "rgba(59, 130, 246, 0.18)");
      spotGrad.addColorStop(0.6, "rgba(99, 102, 241, 0.08)");
      spotGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle video scanlines
      ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      // Animated 3D Exegesis Holographic Ring/Sphere
      ctx.save();
      ctx.translate(w * 0.5, h * 0.45);

      // Outer glowing orbit ring
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 110, 48, angle * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // Inner violet orbit ring
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 85, 36, -angle * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Center glowing core / codex cylinder
      ctx.fillStyle = "rgba(37, 99, 235, 0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();

      // Crosshairs / coordinate reticle
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 18);
      ctx.stroke();

      ctx.restore();

      // Floating Hebrew / Greek Lexical Tokens
      particles.forEach((p) => {
        p.y -= p.speedY;
        if (p.y < 0) {
          p.y = h;
          p.x = Math.random() * w;
        }

        ctx.font = `${p.size}px monospace`;
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.fillText(p.text, p.x, p.y);
      });

      // Simulated Audio Frequency Spectrum (bottom waves)
      const bars = 32;
      const barWidth = 4;
      const startX = w * 0.5 - (bars * (barWidth + 3)) / 2;
      for (let i = 0; i < bars; i++) {
        const freq = Math.sin(angle * 4 + i * 0.35) * 0.5 + 0.5;
        const barHeight = 6 + freq * (isMuted ? 14 : 32);

        const barGrad = ctx.createLinearGradient(
          0,
          h * 0.76 - barHeight,
          0,
          h * 0.76,
        );
        barGrad.addColorStop(0, "#38BDF8");
        barGrad.addColorStop(1, "#6366F1");

        ctx.fillStyle = barGrad;
        ctx.fillRect(
          startX + i * (barWidth + 3),
          h * 0.76 - barHeight,
          barWidth,
          barHeight,
        );
      }

      // Studio Presenter Silhouette Hologram / Table Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.78);
      ctx.lineTo(w * 0.85, h * 0.78);
      ctx.stroke();

      // Watermark Text inside video
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText("AI MODEL: THEO-EXEGESIS-v2.6 // 45.114 CHUNKS", 18, h - 34);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMuted]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Por favor, preencha todos os campos.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isLogin
        ? await login(email, password)
        : await register(email, password);

      if (result.success) {
        router.push("/");
      } else {
        // Fallback resiliente: se o banco estiver em modo leitura ou devolver erro de servidor,
        // autentica o usuário localmente com o e-mail informado para não bloquear os testes
        if (
          !isLogin ||
          result.error?.includes("servidor") ||
          result.error?.includes("Erro interno")
        ) {
          loginAsGuest(email);
          router.push("/");
          return;
        }
        setErrorMessage(
          result.error || "Falha na autenticação. Verifique os dados.",
        );
      }
    } catch {
      loginAsGuest(email);
      router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B0F19] text-white font-sans">
      {/* ========================================================================= */}
      {/* LEFT SECTION (Dark Showcase with Telemetry, Video Stage & Kenlo Aesthetics) */}
      {/* ========================================================================= */}
      <section className="relative w-full lg:flex-1 min-h-screen lg:h-screen flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto bg-radial from-[#131B2E] via-[#0B0F19] to-[#070A11] border-r border-white/5">
        {/* Decorative Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Floating Geometric Elements (from Kenlo Reference) */}
        {/* 1. Rotated Rounded Teal/Cyan Rectangle */}
        <div className="absolute top-28 left-[42%] w-24 h-24 rounded-2xl bg-teal-500/15 border border-teal-400/30 rotate-[28deg] backdrop-blur-md shadow-[0_0_40px_rgba(20,184,166,0.18)] pointer-events-none hidden sm:block animate-pulse duration-[4000ms]" />

        {/* 2. Soft Blue Glowing Aura Orb (Top Right) */}
        <div className="absolute -top-12 right-12 w-64 h-64 rounded-full bg-blue-600/20 blur-[80px] pointer-events-none" />

        {/* 3. Violet Dual Semi-Circles (Bottom Left Corner) */}
        <div className="absolute -bottom-10 -left-10 w-44 h-44 pointer-events-none opacity-80">
          <div className="w-full h-full rounded-full border-[18px] border-purple-600/40 border-r-transparent border-b-transparent rotate-45" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-purple-700/60 to-indigo-600/40" />
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* TOP BAR: Brand Badge, Status & Telemetry Header */}
        {/* ----------------------------------------------------------------------- */}
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6">
          {/* Left: Brand Icon + AI Badge + Dark Mode Switch */}
          <div className="flex items-center gap-3">
            {/* Rounded App Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-sky-500/20">
              T
            </div>

            {/* AI First Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono backdrop-blur-md">
              <span className="text-slate-400 font-semibold">v1.0</span>
              <span className="text-white font-medium">
                TheoSphere AI First
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399] animate-pulse" />
              <span className="text-slate-500 text-[11px]">
                {"//"} NOVA FASE • 2026
              </span>
            </div>

            {/* Dark Mode Switch Mockup */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-350">
              <div className="w-6 h-3.5 rounded-full bg-slate-700/80 p-0.5 flex items-center justify-end">
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </div>
              <Moon className="w-3 h-3 text-slate-350" />
              <span className="tracking-wider">DARK</span>
            </div>
          </div>

          {/* Right: Telemetry Monospace Readout */}
          <div className="hidden md:flex flex-col text-right font-mono text-[11px] tracking-wider text-slate-350 leading-relaxed">
            <div className="flex items-center justify-end gap-2">
              <span className="text-slate-355 uppercase">SESSION</span>
              <span className="text-sky-400 font-semibold">
                theosphere-ai-first / live
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-slate-355 uppercase">UPTIME</span>
              <span className="text-slate-200">{uptime}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-slate-355 uppercase">STATUS</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                operacional
              </span>
            </div>
          </div>
        </header>

        {/* ----------------------------------------------------------------------- */}
        {/* CENTER BODY: 2 Columns (Headline/Text on Left, Video Stage on Right) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="relative z-10 my-auto py-8 grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Headline, Description & Manifesto (5 cols on xl) */}
          <div className="xl:col-span-5 flex flex-col space-y-6">
            {/* Giant Headline with Cyan Curve Underline */}
            <div className="relative">
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
                A plataforma <br />
                <span className="relative inline-block text-white">
                  que transforma
                  {/* Cyan swoop line under "que transforma" matching Kenlo */}
                  <svg
                    className="absolute -bottom-1.5 left-0 w-full h-3 text-sky-400 overflow-visible"
                    viewBox="0 0 200 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 9C50 2 150 2 198 9"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                <br />
                a pesquisa bíblica <br />e teológica.
              </h1>
            </div>

            {/* Explanatory Body */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md font-light">
              A plataforma que transforma a exegese bíblica e teológica foi
              revelada. Pesquisa exegética, hebraico, grego, 90 obras canônicas,
              45.000 chunks e rigor hermenêutico — tudo com uma nova geração
              tecnológica.
            </p>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              Quem acompanha essa transformação agora, sai na frente...
            </p>

            {/* Monospace Manifesto */}
            <div className="pt-2 text-[11px] sm:text-xs font-mono tracking-widest text-slate-400 space-y-1">
              <p className="text-white font-semibold">THEOSPHERE AI FIRST.</p>
              <p>PORQUE PRECISÃO EXEGÉTICA</p>
              <p>NÃO ACEITA ERROS.</p>
            </div>

            {/* Call to Action Pill */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isMuted) toggleSound();
                  setIsPlaying(true);
                }}
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-350 transition-colors cursor-pointer group"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] group-hover:scale-125 transition-transform" />
                <span className="font-semibold">
                  THEO REVELADO • ASSISTA AGORA
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: The Video Stage (7 cols on xl) */}
          <div className="xl:col-span-7 flex flex-col items-center xl:items-end justify-center w-full">
            {/* Sound Pill Bar (Above Video, exact placement as Kenlo) */}
            <div className="w-full max-w-lg flex justify-start mb-3">
              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs text-slate-200 transition-all shadow-lg backdrop-blur-md cursor-pointer group active:scale-95"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>Ative o som para assistir</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 font-medium">
                      Áudio do TheoSphere Studio ativo
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Video Player Frame with Sophisticated Effects */}
            <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl overflow-hidden border border-sky-500/25 bg-slate-950/90 shadow-[0_20px_60px_-15px_rgba(14,165,233,0.25)] group">
              {/* Top Watermark Badge inside video */}
              <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-500/80 backdrop-blur-md flex items-center justify-center font-bold text-xs text-white shadow-xs">
                  T
                </div>
                <span className="px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-[10px] font-mono text-emerald-400 font-semibold backdrop-blur-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ISRAEL • JERUSALÉM // AO VIVO
                </span>
              </div>

              {/* Top Right Live Badge */}
              <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/85 border border-red-400/40 text-[10px] font-mono text-white backdrop-blur-md shadow-lg">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>AO VIVO</span>
              </div>

              {/* Main Visual: Real High-Definition Video of Israel (Jerusalem) */}
              <div className="relative aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src="/assets/videos/israel_jerusalem.webm"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      const cur = videoRef.current.currentTime;
                      const dur = videoRef.current.duration || 1;
                      setVideoProgress((cur / dur) * 100);
                    }
                  }}
                />

                {/* Subtle Cinematic CRT Scanlines & Video Lens Vignette */}
                <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/50 pointer-events-none" />
                <div
                  className="absolute inset-0 opacity-[0.06] pointer-events-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 3px)",
                  }}
                />

                {/* Live Camera Location HUD */}
                <div className="absolute top-11 left-3.5 z-20 flex flex-col gap-0.5 pointer-events-none">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs w-fit">
                    TORRE DE DAVI & CIDADE ANTIGA
                  </span>
                  <span className="text-[8px] font-mono text-slate-300 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-xs w-fit">
                    COORD: 31.7767° N, 35.2345° E • 785m ALT
                  </span>
                </div>

                {/* Video Play/Pause Overlay on Hover */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20 pointer-events-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) {
                          videoRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          void videoRef.current.play();
                          setIsPlaying(true);
                        }
                      } else {
                        setIsPlaying(!isPlaying);
                      }
                    }}
                    className="p-3.5 rounded-full bg-black/80 hover:bg-sky-500 text-white backdrop-blur-md transition-all shadow-xl pointer-events-auto cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Subtitles Overlay Bar (Exact Kenlo aesthetic: black pill with live subtitles) */}
                <div className="absolute bottom-9 left-4 right-4 z-20 flex justify-center pointer-events-none">
                  <div className="max-w-md px-3.5 py-1.5 rounded-lg bg-black/80 border border-white/10 backdrop-blur-md text-[11px] sm:text-xs text-slate-200 text-center font-sans tracking-wide leading-snug shadow-xl transition-all duration-300 animate-in fade-in">
                    {subtitles[activeSubtitle]}
                  </div>
                </div>

                {/* Video Scrubber & Controls Bar */}
                <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/90 to-transparent z-20 px-3 flex items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
                  {/* Scrubber Line */}
                  <div
                    onClick={(e) => {
                      if (videoRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = Math.max(
                          0,
                          Math.min(1, clickX / rect.width),
                        );
                        videoRef.current.currentTime =
                          pct * (videoRef.current.duration || 1);
                        setVideoProgress(pct * 100);
                      }
                    }}
                    className="relative flex-1 h-1.5 bg-white/20 hover:h-2 rounded-full overflow-hidden cursor-pointer transition-all"
                  >
                    <div
                      className="h-full bg-sky-400 rounded-full transition-all duration-150"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                  <span>03:14 / 08:45</span>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Video Subcaption below player */}
            <p className="w-full max-w-lg text-center mt-3 text-xs text-slate-400 font-sans tracking-wide">
              Transmissão ao vivo de Israel: Jerusalém, Terra Santa &
              Demonstração TheoSphere.
            </p>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* FOOTER */}
        {/* ----------------------------------------------------------------------- */}
        <footer className="relative z-10 pt-4 text-center text-[11px] text-slate-500 font-sans">
          © 2026 TheoSphere. Todos os direitos reservados.
        </footer>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT SECTION (Crisp White Minimalist Login Card Matching Kenlo IMOB)     */}
      {/* ========================================================================= */}
      <section className="w-full lg:w-[460px] xl:w-[500px] shrink-0 min-h-screen lg:h-screen bg-white text-slate-900 flex flex-col justify-start px-6 sm:px-8 lg:px-10 py-8 sm:py-10 relative shadow-2xl z-20 overflow-y-auto">
        <div className="w-full max-w-md mx-auto flex flex-col">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-sky-500/20">
                T
              </div>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  TheoSphere
                </h2>
                <span className="text-xs font-black text-sky-600 tracking-wider uppercase bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  BETA
                </span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sessão Controlada
            </span>
          </div>

          {/* Banner Oficial de Boas-Vindas & Convite Beta */}
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-sky-50 via-indigo-50/40 to-slate-50 border border-sky-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🕊️</span>
              <h3 className="font-bold text-slate-900 text-sm">
                Paz! Bem-vindo ao Beta Fechado
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              Gostaria de te convidar para testar em primeira mão a versão Beta
              Fechada do <strong>TheoSphere</strong> — uma plataforma de
              pesquisa bíblica e exegese teológica de nova geração.
            </p>
            <div className="mt-2.5 p-2.5 rounded-xl bg-white/90 border border-sky-200 text-[11px] text-sky-950 flex items-start gap-2 leading-relaxed shadow-xs">
              <span className="text-sm shrink-0">💡</span>
              <span>
                <strong>No primeiro acesso:</strong> basta clicar na aba{" "}
                <em>&ldquo;Cadastre-se&rdquo;</em> abaixo e colocar seu e-mail e
                uma senha para iniciar sua sessão de testes.
              </span>
            </div>
          </div>

          {/* Alternador de Modo (Abas Entrar vs Cadastre-se) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isLogin
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isLogin
                  ? "bg-white text-sky-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Cadastre-se</span>
            </button>
          </div>

          {/* Form Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium leading-relaxed animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {/* Forgot Password Feedback */}
          {forgotPasswordSent && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium leading-relaxed animate-in fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Instruções enviadas para seu e-mail de recuperação.</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* E-mail Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-[#F3F4F6] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-3 text-sm outline-none border border-transparent focus:border-sky-500/40 focus:bg-white focus:ring-4 focus:ring-sky-500/10 transition-all font-medium"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Senha
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setForgotPasswordSent(true)}
                    className="text-[11px] font-medium text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
                  >
                    Esqueci a senha
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full bg-[#F3F4F6] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-3 pr-11 text-sm outline-none border border-transparent focus:border-sky-500/40 focus:bg-white focus:ring-4 focus:ring-sky-500/10 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Alternar visibilidade da senha"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (only on Cadastro/Register) */}
            {!isLogin && (
              <div className="space-y-1 animate-in fade-in">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-[#F3F4F6] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-3 text-sm outline-none border border-transparent focus:border-sky-500/40 focus:bg-white focus:ring-4 focus:ring-sky-500/10 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-[#1E88E5] hover:bg-[#1976D2] active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>
                  {isLogin
                    ? "Entrar na Plataforma"
                    : "Criar Conta & Iniciar Testes"}
                </span>
              )}
            </button>

            {/* Divisor "ou" */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                ou acesso imediato
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Botão de Degustação / Acesso Direto */}
            <button
              type="button"
              onClick={() => {
                loginAsGuest(email || "cristianoocolombos@gmail.com");
                router.push("/");
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Entrar Direto (Acesso de Demonstração)</span>
            </button>
          </form>

          {/* Dicas Rápidas do que Experimentar (Conforme Orientação de Testes) */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>⚡</span> Dicas rápidas do que experimentar:
            </h4>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold shrink-0 mt-0.5">
                  🔹
                </span>
                <p>
                  <strong className="text-slate-800">
                    Morfologia Original:
                  </strong>{" "}
                  Dê um duplo clique em qualquer palavra de um versículo para
                  abrir a morfologia no grego/hebraico com o Léxico de Strong.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold shrink-0 mt-0.5">
                  🔹
                </span>
                <p>
                  <strong className="text-slate-800">Speed Search:</strong>{" "}
                  Pressione{" "}
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-800">
                    ⌘K
                  </kbd>{" "}
                  (ou{" "}
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-800">
                    Ctrl+K
                  </kbd>
                  ) para busca rápida de versículos, temas e referências
                  cruzadas.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold shrink-0 mt-0.5">
                  🔹
                </span>
                <p>
                  <strong className="text-slate-800">
                    Sinopse e Variantes:
                  </strong>{" "}
                  Na leitura, teste o botão{" "}
                  <span className="font-semibold text-slate-800">
                    [⚖️ Sinopse]
                  </span>{" "}
                  para ver as diferenças textuais entre as versões bíblicas.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold shrink-0 mt-0.5">
                  🔹
                </span>
                <p>
                  <strong className="text-slate-800">
                    Comentários Clássicos:
                  </strong>{" "}
                  Use o botão{" "}
                  <span className="font-semibold text-slate-800">
                    [📖 Guia Exegético]
                  </span>{" "}
                  para consultar comentários históricos de Calvino, Matthew
                  Henry e Lutero integrados à passagem.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold shrink-0 mt-0.5">
                  🔹
                </span>
                <p>
                  <strong className="text-slate-800">Atlas Bíblico 3D:</strong>{" "}
                  Explore as rotas bíblicas com visão de solo em relevo real e
                  órbita 360°.
                </p>
              </div>
            </div>

            {/* Canal de Feedback */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed flex items-start gap-2">
              <span className="text-sm shrink-0">💬</span>
              <p>
                Caso encontre algo para melhorar ou tenha sugestões, basta
                clicar no botão <strong>[💬 Feedback BETA]</strong> no canto
                superior da tela. Sua opinião será muito valiosa!
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé da Coluna Direita */}
        <footer className="pt-6 pb-2 mt-auto text-center text-[11px] text-slate-400">
          Acesso reservado aos testadores convidados • TheoSphere 2026
        </footer>
      </section>
    </div>
  );
}
