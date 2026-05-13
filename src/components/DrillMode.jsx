import React, { useState, useEffect, useRef } from "react";
import { db } from "../db";
import { seedAlamatDatabase } from "../services/generator";
import { updateProgress } from "../adaptiveEngine";

const SUBJECT_TIMERS = {
  Mathematics: 90,
  Science: 60,
  "Reading Comprehension": 80,
  "Language Proficiency": 45,
  "Filipino": 45,
  "Abstract Reasoning": 60,
  "General Knowledge": 30,
  "Civil Service - Verbal": 50,
  "Civil Service - Numerical": 70,
  "Civil Service - Analytical": 60,
};

export default function DrillMode({ weakSubjects, onExit }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    loadNext();
  }, []);

  useEffect(() => {
    if (!question || isSubmitted) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question, isSubmitted]);

  async function loadNext() {
    setIsLoading(true);
    setSelected(null);
    setIsSubmitted(false);

    // Pick a random weak subject each question
    const subject = weakSubjects[Math.floor(Math.random() * weakSubjects.length)];

    // Try to find an unseen question from the weak subjects in the DB
    const all = await db.questions.toArray();
    const pool = all.filter((q) => weakSubjects.includes(q.subject) && q.seen !== 1);

    if (pool.length === 0) {
      // Seed more questions for this subject
      await seedAlamatDatabase(subject, 5, false);
      const fresh = await db.questions.toArray();
      const newPool = fresh.filter((q) => weakSubjects.includes(q.subject) && q.seen !== 1);
      if (newPool.length > 0) {
        const next = newPool[Math.floor(Math.random() * newPool.length)];
        await db.questions.update(next.id, { seen: 1 });
        setQuestion(next);
        setTimeLeft(SUBJECT_TIMERS[next.subject] || 60);
      }
    } else {
      const next = pool[Math.floor(Math.random() * pool.length)];
      await db.questions.update(next.id, { seen: 1 });
      setQuestion(next);
      setTimeLeft(SUBJECT_TIMERS[next.subject] || 60);
    }

    setIsLoading(false);
  }

  async function handleAnswer(index) {
    if (isSubmitted) return;
    clearInterval(timerRef.current);
    setSelected(index);
    setIsSubmitted(true);
    const isCorrect = index === question.correctIndex;
    setTotal((t) => t + 1);
    setCorrect((c) => isCorrect ? c + 1 : c);
    setStreak((s) => isCorrect ? s + 1 : 0);
    await updateProgress(question.topic, isCorrect, question.subject);
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? "0" + (s % 60) : s % 60}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#05070a]/90 backdrop-blur border-b border-white/5 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onExit} className="text-slate-600 hover:text-white transition-all text-sm font-bold">← Exit</button>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Weak Topic Drill</span>
          </div>
          <div className="flex items-center gap-4">
            {streak >= 3 && (
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest animate-pulse">
                🔥 {streak} streak
              </span>
            )}
            <span className="text-slate-500 text-[10px] font-bold uppercase">{correct}/{total} correct</span>
            <span className={`font-mono font-black ${timeLeft < 15 ? "text-rose-500 animate-pulse" : "text-white"}`}>
              {fmt(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Weak subjects chips */}
        <div className="flex gap-2 flex-wrap">
          {weakSubjects.map((s) => (
            <span key={s} className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">
              {s}
            </span>
          ))}
        </div>

        {question && (
          <>
            {question.visualPrompt && (
              <div className="bg-[#0a0c10] border border-amber-500/20 rounded-2xl p-5">
                {/[|\\/_*]/.test(question.visualPrompt) ? (
                  <pre className="font-mono text-amber-400 text-sm leading-tight overflow-x-auto">{question.visualPrompt}</pre>
                ) : (
                  <p className="text-amber-100/70 text-base italic">"{question.visualPrompt}"</p>
                )}
              </div>
            )}

            <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">{question.question}</h2>

            <div className="grid gap-3">
              {(question.options || []).map((opt, i) => (
                <button
                  key={i}
                  disabled={isSubmitted}
                  onClick={() => handleAnswer(i)}
                  className={`w-full p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all
                    ${selected === i ? "border-amber-500 bg-amber-500/10" : "border-white/5 bg-white/[0.02] hover:border-white/20"}
                    ${isSubmitted && i === question.correctIndex ? "!border-emerald-500 !bg-emerald-500/10" : ""}
                    ${isSubmitted && selected === i && i !== question.correctIndex ? "!border-rose-500/50 !bg-rose-500/10" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black border-2 shrink-0
                    ${selected === i ? "bg-amber-500 border-amber-500 text-black" : "border-white/10 text-slate-500"}
                    ${isSubmitted && i === question.correctIndex ? "!bg-emerald-500 !border-emerald-500 !text-black" : ""}`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-slate-300">{opt}</span>
                </button>
              ))}
            </div>

            {isSubmitted && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${selected === question.correctIndex ? "text-emerald-400" : "text-rose-400"}`}>
                    {selected === question.correctIndex ? "• Correct" : "• Incorrect"}
                  </p>
                  <p className="text-slate-400 italic leading-relaxed">"{question.explanation}"</p>
                </div>
                <button
                  onClick={loadNext}
                  className="w-full py-5 bg-amber-500 text-black font-black rounded-2xl text-lg uppercase hover:bg-white transition-all"
                >
                  Next Question
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
