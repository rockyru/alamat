import React, { useEffect, useState } from "react";
import { EXAMS } from "./ExamSelector";
import { db } from "../db";

const MODE_CARDS = [
  {
    key: "practice",
    label: "Practice Mode",
    description: "Adaptive questions scoped to your exam. Gets harder as you improve.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/60",
    labelColor: "text-cyan-400",
    iconBg: "bg-cyan-500/20 text-cyan-400",
    cta: "Start Practice",
    ctaClass: "bg-cyan-500 hover:bg-white text-black",
  },
  {
    key: "upcat",
    label: "Full Mock Exam",
    description: "Timed 240-item UPCAT simulation across all 4 subtests with UPG scoring.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    color: "from-violet-500/20 to-violet-500/5 border-violet-500/30 hover:border-violet-500/60",
    labelColor: "text-violet-400",
    iconBg: "bg-violet-500/20 text-violet-400",
    cta: "Begin Exam",
    ctaClass: "bg-violet-500 hover:bg-white text-black",
  },
  {
    key: "drill",
    label: "Weak Topic Drill",
    description: "AI-identified weak areas drilled until your accuracy improves.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    color: "from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:border-amber-500/60",
    labelColor: "text-amber-400",
    iconBg: "bg-amber-500/20 text-amber-400",
    cta: "Start Drill",
    ctaClass: "bg-amber-500 hover:bg-white text-black",
  },
  {
    key: "studyplan",
    label: "Study Plan",
    description: "Personalized day-by-day schedule based on your weak topics and exam date.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/60",
    labelColor: "text-emerald-400",
    iconBg: "bg-emerald-500/20 text-emerald-400",
    cta: "Generate Plan",
    ctaClass: "bg-emerald-500 hover:bg-white text-black",
  },
];

export default function LandingPage({ examKey, setExamKey, onPractice, onUPCAT, onDrill, onStudyPlan }) {
  const [stats, setStats] = useState({ total: 0, correct: 0, streak: 0, subjects: 0 });
  const [hasProgress, setHasProgress] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);

  useEffect(() => {
    async function loadStats() {
      const progress = await db.progress.toArray();
      if (progress.length === 0) return;
      setHasProgress(true);
      const total = progress.reduce((s, p) => s + p.totalAttempts, 0);
      const correct = progress.reduce((s, p) => s + p.correctAttempts, 0);
      const subjects = new Set(progress.map((p) => p.subject)).size;
      setStats({ total, correct, streak: 0, subjects });
    }
    loadStats();
  }, []);

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

  async function handleMode(key) {
    setLoadingKey(key);
    if (key === "practice") onPractice();
    else if (key === "upcat") onUPCAT();
    else if (key === "drill") await onDrill();
    else if (key === "studyplan") onStudyPlan();
    setLoadingKey(null);
  }

  const selectedExam = EXAMS.find((e) => e.key === examKey);

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-16 space-y-16">
        {/* Hero */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-black font-black text-lg shadow-[0_0_30px_rgba(6,182,212,0.5)]">
              A
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
              Assisted Learning for Mastery and Assessment Training
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed">
              Intelligent exam preparation for UPCAT, Civil Service, and Philippine college entrance exams — powered by adaptive AI.
            </p>
          </div>

          {/* Stats row — only if has progress */}
          {hasProgress && (
            <div className="flex gap-6 pt-2">
              <div>
                <p className="text-2xl font-black text-white">{stats.total}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Questions</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-2xl font-black text-cyan-400">{accuracy}%</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Accuracy</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-2xl font-black text-white">{stats.subjects}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Subjects</p>
              </div>
            </div>
          )}
        </div>

        {/* Exam selector */}
        <div className="space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Select Your Exam</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXAMS.map((exam) => {
              const isActive = examKey === exam.key;
              return (
                <button
                  key={exam.key}
                  onClick={() => setExamKey(exam.key)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    isActive
                      ? `${exam.activeColor} scale-[1.02]`
                      : `${exam.color} opacity-60 hover:opacity-100`
                  }`}
                >
                  <p className={`text-xs font-black uppercase tracking-wider ${exam.labelColor}`}>{exam.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{exam.description}</p>
                </button>
              );
            })}
          </div>
          {selectedExam && (
            <p className="text-[10px] text-slate-600 font-bold">
              {selectedExam.subjects.length} subjects · {selectedExam.subjects.join(", ")}
            </p>
          )}
        </div>

        {/* Mode cards */}
        <div className="space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Choose Mode</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODE_CARDS.map((card) => {
              const isLoading = loadingKey === card.key;
              return (
                <button
                  key={card.key}
                  onClick={() => handleMode(card.key)}
                  disabled={!!loadingKey}
                  className={`group p-6 rounded-3xl border bg-linear-to-br ${card.color} text-left transition-all duration-200 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-wait`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                      {isLoading
                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : card.icon}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all ${card.labelColor}`}>
                      {isLoading ? "Loading..." : `${card.cta} →`}
                    </span>
                  </div>
                  <p className={`text-sm font-black uppercase tracking-wider mb-1 ${card.labelColor}`}>{card.label}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{card.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 pt-8 flex items-center justify-between">
          <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">
            ALAMAT · Philippine Exam Reviewer
          </p>
          <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">
            Adaptive · Intelligent · Free
          </p>
        </div>
      </div>
    </div>
  );
}
