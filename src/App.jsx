import React, { useState, useEffect, useRef } from "react";
import { updateProgress } from "./adaptiveEngine";
import { seedAlamatDatabase } from "./services/generator";
import { db } from "./db";
import UPCATMock from "./components/UPCATMock";

// Map colors to subjects for better visual hierarchy
const SUBJECT_THEMES = {
  Mathematics: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  Science: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  "Language Proficiency": "border-purple-500/40 text-purple-400 bg-purple-500/10",
  "Reading Comprehension": "border-amber-500/40 text-amber-400 bg-amber-500/10",
  "General Knowledge": "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
  "Filipino": "border-rose-500/40 text-rose-400 bg-rose-500/10",
  "Abstract Reasoning": "border-violet-500/40 text-violet-400 bg-violet-500/10",
  "Civil Service - Verbal": "border-orange-500/40 text-orange-400 bg-orange-500/10",
  "Civil Service - Numerical": "border-teal-500/40 text-teal-400 bg-teal-500/10",
  "Civil Service - Analytical": "border-pink-500/40 text-pink-400 bg-pink-500/10",
};

function PracticeApp({ onEnterUPCAT }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [sessionCount, setSessionCount] = useState(0);
  const [isSessionOver, setIsSessionOver] = useState(false);
  const [showMastery, setShowMastery] = useState(false);
  const [masteryStats, setMasteryStats] = useState({});
  const [isSeeding, setIsSeeding] = useState(false);
  const [isHardMode, setIsHardMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const timerRef = useRef(null);
  const SESSION_LIMIT = 10;

  const SUBJECT_TIMERS = {
    // UPCAT / College Entrance
    Mathematics: 90,
    Science: 60,
    "Reading Comprehension": 80,
    "Language Proficiency": 45,
    "Filipino": 45,
    "Abstract Reasoning": 60,
    "General Knowledge": 30,
    // Civil Service Exam
    "Civil Service - Verbal": 50,
    "Civil Service - Numerical": 70,
    "Civil Service - Analytical": 60,
  };

  useEffect(() => {
    async function boot() {
      const saved = localStorage.getItem("alamat_session_data");
      let startAtCount = 0;
      if (saved) {
        const parsed = JSON.parse(saved);
        setScore(parsed.score || { correct: 0, total: 0 });
        setSessionCount(parsed.sessionCount || 0);
        setIsHardMode(parsed.isHardMode || false);
        startAtCount = parsed.sessionCount || 0;
      }
      const count = await db.questions.count();
      if (count === 0) await seedAlamatDatabase("Mathematics", 2, isHardMode);
      loadNextQuestion(startAtCount);
    }
    boot();
  }, []);

  useEffect(() => {
    if (sessionCount > 0 && !isSessionOver) {
      localStorage.setItem("alamat_session_data", JSON.stringify({ score, sessionCount, isHardMode }));
    } else if (isSessionOver) {
      localStorage.removeItem("alamat_session_data");
    }
  }, [score, sessionCount, isHardMode, isSessionOver]);

  const loadNextQuestion = async (overrideCount = null) => {
    const effectiveCount = overrideCount !== null ? overrideCount : sessionCount;
    if (effectiveCount >= SESSION_LIMIT) {
      setIsSessionOver(true);
      setIsLoading(false);
      setIsTransitioning(false);
      return;
    }

    setIsTransitioning(true);
    try {
      const allQuestions = await db.questions.toArray();
      const unseen = allQuestions.filter((q) => q.seen !== 1);

      if (unseen.length < 5 && !isSeeding) {
        setIsSeeding(true);
        const subjects = Object.keys(SUBJECT_TIMERS);
        seedAlamatDatabase(subjects[Math.floor(Math.random() * subjects.length)], 2, isHardMode).finally(() =>
          setTimeout(() => setIsSeeding(false), 5000),
        );
      }

      if (unseen.length > 0) {
        const nextQ = unseen[Math.floor(Math.random() * unseen.length)];
        await db.questions.update(nextQ.id, { seen: 1 });

        setTimeout(() => {
          setCurrentQuestion(nextQ);
          setSelected(null);
          setIsSubmitted(false);
          setTimeLeft(SUBJECT_TIMERS[nextQ.subject] || 60);
          setIsLoading(false);
          setIsTransitioning(false);
        }, 600);
      } else {
        setTimeout(() => loadNextQuestion(effectiveCount), 2000);
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      setIsTransitioning(false);
    }
  };

  const handleCheck = async (index) => {
    if (isSubmitted) return;
    clearInterval(timerRef.current);
    setSelected(index);
    setIsSubmitted(true);
    const isCorrect = index === currentQuestion.correctIndex;
    setScore((prev) => ({ correct: isCorrect ? prev.correct + 1 : prev.correct, total: prev.total + 1 }));
    setSessionCount((prev) => prev + 1);
    await updateProgress(currentQuestion.topic, isCorrect, currentQuestion.subject);
  };

  const toggleMastery = async () => {
    if (!showMastery) {
      const progress = await db.progress.toArray();
      const stats = {
        Mathematics: { correct: 0, total: 0, color: "text-blue-400" },
        Science: { correct: 0, total: 0, color: "text-emerald-400" },
        "Language Proficiency": { correct: 0, total: 0, color: "text-purple-400" },
        "Reading Comprehension": { correct: 0, total: 0, color: "text-amber-400" },
        Filipino: { correct: 0, total: 0, color: "text-rose-400" },
        "Abstract Reasoning": { correct: 0, total: 0, color: "text-violet-400" },
        "General Knowledge": { correct: 0, total: 0, color: "text-cyan-400" },
        "Civil Service - Verbal": { correct: 0, total: 0, color: "text-orange-400" },
        "Civil Service - Numerical": { correct: 0, total: 0, color: "text-teal-400" },
        "Civil Service - Analytical": { correct: 0, total: 0, color: "text-pink-400" },
      };
      progress.forEach((p) => {
        if (stats[p.subject]) {
          stats[p.subject].correct += p.correctAttempts;
          stats[p.subject].total += p.totalAttempts;
        }
      });
      setMasteryStats(stats);
    }
    setShowMastery(!showMastery);
  };

  const renderAIInsight = () => {
    const valid = Object.entries(masteryStats).filter(([_, d]) => d.total > 0);
    if (valid.length === 0) return <p className="text-slate-500 italic">Analyzing performance patterns...</p>;
    const avgAccuracy = valid.reduce((acc, [_, d]) => acc + d.correct / d.total, 0) / valid.length;
    const predictedUPG = (2.8 - avgAccuracy * 1.8).toFixed(3);
    const worst = valid.sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0];
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <span className="text-cyan-500 font-black text-xs uppercase tracking-widest">Est. UPG Score</span>
          <span className="text-4xl font-black text-white">{predictedUPG}</span>
        </div>
        <p className="text-cyan-100/70 text-lg leading-relaxed italic">
          "Current trajectory suggests a <strong>{predictedUPG}</strong>. Focus on <strong>{worst[0]}</strong> to break the qualifier
          threshold."
        </p>
      </div>
    );
  };

  useEffect(() => {
    if (currentQuestion && !isSubmitted && timeLeft > 0 && !isSessionOver) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && !isSubmitted && !isSessionOver) {
      handleCheck(-1);
    }
    return () => clearInterval(timerRef.current);
  }, [currentQuestion, isSubmitted, timeLeft, isSessionOver]);

  if (isLoading && !currentQuestion) {
    return (
      <div className="h-screen bg-[#05070a] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-cyan-500 font-black text-xs uppercase tracking-[0.3em]">Syncing Alamat Vault</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Progress Bar */}
      <div className="flex gap-1 h-1 w-full bg-white/5 sticky top-0 z-[60]">
        {[...Array(SESSION_LIMIT)].map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 transition-all duration-500 ${i < sessionCount ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4]" : "bg-white/10"}`}
          />
        ))}
      </div>

      <nav className="border-b border-white/5 px-6 py-4 bg-[#05070a]/80 backdrop-blur-md sticky top-1 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              A
            </div>
            <span className="hidden sm:block font-bold text-xl text-white italic tracking-tighter uppercase">Alamat</span>
          </div>

          <div className="flex items-center gap-2">
            {/* UPCAT Mock */}
            <button
              onClick={onEnterUPCAT}
              title="UPCAT Mock Exam"
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </button>

            {/* Hard Mode toggle */}
            <button
              onClick={async () => {
                const next = !isHardMode;
                setIsHardMode(next);
                setIsLoading(true);
                await db.questions.clear();
                const subjects = Object.keys(SUBJECT_TIMERS);
                await seedAlamatDatabase(subjects[Math.floor(Math.random() * subjects.length)], 5, next);
                loadNextQuestion(sessionCount);
              }}
              title={isHardMode ? "Hard Mode — click to switch to Standard" : "Standard — click to switch to Hard Mode"}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${isHardMode ? "bg-rose-500/20 border-rose-500/60 text-rose-400" : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </button>

            {/* Vault */}
            <button
              onClick={toggleMastery}
              title="Mastery Vault"
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all bg-white/5 border-white/10 text-cyan-400 hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>

            {/* Timer */}
            <div className="border-l border-white/10 pl-3 ml-1 text-right">
              <p className="text-[9px] text-slate-500 font-bold uppercase leading-none mb-0.5">Timer</p>
              <p className={`text-lg font-mono font-bold leading-none ${timeLeft < 15 ? "text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "text-white"}`}>
                {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? `0${timeLeft % 60}` : timeLeft % 60}
              </p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        {isSessionOver ? (
          /* SESSION OVER UI */
          <div className="max-w-3xl mx-auto text-center animate-in fade-in zoom-in-95">
            <h2 className="text-6xl font-black text-white mb-12 italic uppercase tracking-tighter">Cycle Complete</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
              <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[40px]">
                <span className="text-slate-500 text-xs font-bold uppercase block mb-2">Accuracy</span>
                <span className="text-7xl font-black text-cyan-400">
                  {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[40px]">
                <span className="text-slate-500 text-xs font-bold uppercase block mb-2">Status</span>
                <span className="text-4xl font-black text-white uppercase">{score.correct >= 9 ? "Priority" : "Qualifier"}</span>
              </div>
            </div>
            <button
              onClick={async () => {
                localStorage.removeItem("alamat_session_data");
                await db.questions.clear();
                window.location.reload();
              }}
              className="w-full bg-cyan-500 text-black py-8 rounded-[40px] font-black text-2xl uppercase hover:bg-white transition-all shadow-2xl"
            >
              New Cycle
            </button>
          </div>
        ) : (
          currentQuestion && (
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
              <div className="flex-1 space-y-12 w-full">
                {/* REFACTORED VISUAL BOX */}
                {currentQuestion.visualPrompt && (
                  <div className="bg-[#0a0c10] border-2 border-cyan-500/30 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-cyan-500/10 px-6 py-2 border-b border-cyan-500/20 flex justify-between items-center">
                      <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Visual Reference Engine</p>
                      {/* The fix you implemented for the ID */}
                      <span className="text-[9px] text-cyan-500/40 font-bold uppercase tracking-tighter">
                        ID: {String(currentQuestion.id || "").padStart(4, "0")}
                      </span>
                    </div>
                    <div className="p-6">
                      {/* Check if it's a real ASCII diagram vs just a text description */}
                      {/[|\\/_*]/.test(currentQuestion.visualPrompt) ? (
                        <pre className="font-mono text-cyan-400 text-sm leading-tight bg-black/40 p-4 rounded-xl overflow-x-auto border border-white/5">
                          {currentQuestion.visualPrompt}
                        </pre>
                      ) : (
                        <div className="flex gap-4 items-start bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/10">
                          <div className="w-1 h-12 bg-cyan-500/50 rounded-full" />
                          <p className="text-cyan-100/70 text-lg italic leading-relaxed">"{currentQuestion.visualPrompt}"</p>
                        </div>
                      )}
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-4">System Observation Active</p>
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border transition-colors ${SUBJECT_THEMES[currentQuestion.subject] || "border-cyan-500/20 text-cyan-500"}`}
                    >
                      {currentQuestion.subject || "General Education"}
                    </span>
                    <span className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
                      / / {currentQuestion.topic || "Core Concept"}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                    {currentQuestion.question || "Analyzing task parameters..."}
                  </h2>
                </div>

                {/* OPTIONS */}
                <div className="grid gap-4 max-w-2xl">
                  {(currentQuestion.options || []).map((option, i) => (
                    <button
                      key={i}
                      disabled={isSubmitted}
                      onClick={() => handleCheck(i)}
                      className={`group w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center ${selected === i ? "border-cyan-500 bg-cyan-500/5 shadow-lg" : "border-white/5 bg-white/[0.02] hover:border-white/20"} ${isSubmitted && i === currentQuestion.correctIndex ? "!border-emerald-500 !bg-emerald-500/10" : ""} ${isSubmitted && selected === i && i !== currentQuestion.correctIndex ? "!border-rose-500/50 !bg-rose-500/10" : ""}`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center mr-6 font-black text-lg border-2 ${selected === i ? "bg-cyan-500 border-cyan-500 text-black shadow-lg" : "border-white/10 text-slate-500"} ${isSubmitted && i === currentQuestion.correctIndex ? "!bg-emerald-500 !border-emerald-500 !text-black" : ""}`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-lg md:text-xl text-slate-300 group-hover:text-white">{option}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SIDEBAR */}
              <div className="w-full lg:w-80 lg:shrink-0 sticky top-32">
                {isSubmitted ? (
                  <div className="bg-[#0a0c10] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-right-8">
                    <p
                      className={`text-[10px] font-black uppercase tracking-widest mb-6 ${selected === currentQuestion.correctIndex ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {selected === currentQuestion.correctIndex ? "• Verified" : "• Needs Review"}
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed mb-10 italic">"{currentQuestion.explanation}"</p>
                    <button
                      onClick={() => loadNextQuestion()}
                      disabled={isTransitioning}
                      className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-cyan-400 transition-all text-lg flex items-center justify-center gap-3"
                    >
                      {isTransitioning ? (
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Continue"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/5 p-16 rounded-[40px] text-center opacity-30">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Input Required</p>
                    <div className="w-1 h-8 bg-cyan-500/30 mx-auto rounded-full animate-bounce" />
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </main>

      {/* MASTERY MODAL */}
      {showMastery && (
        <div className="fixed inset-0 z-[100] bg-[#05070a]/95 backdrop-blur-3xl p-6 lg:p-20 overflow-y-auto animate-in fade-in duration-300">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-16">
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Mastery Vault</h2>
              <button
                onClick={() => setShowMastery(false)}
                className="text-white bg-white/5 hover:bg-rose-500 w-12 h-12 flex items-center justify-center rounded-full transition-all"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {Object.entries(masteryStats).map(([name, stat]) => {
                const percentage = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                return (
                  <div
                    key={name}
                    className="bg-white/[0.03] border border-white/5 p-8 rounded-[32px]"
                  >
                    <div className="flex justify-between mb-4 items-end">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{name}</span>
                      <span className={`font-black text-2xl ${stat.color}`}>{percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full ${stat.color.replace("text", "bg")} shadow-[0_0_10px_currentColor]`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 p-10 rounded-[40px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
              {renderAIInsight()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("practice");

  if (mode === "upcat") {
    return (
      <UPCATMock
        onExit={async () => {
          await db.questions.clear();
          setMode("practice");
        }}
      />
    );
  }

  return <PracticeApp onEnterUPCAT={() => setMode("upcat")} />;
}
