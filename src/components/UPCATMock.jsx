import React, { useState, useEffect, useRef } from "react";
import { db } from "../db";
import { seedAlamatDatabase } from "../services/generator";
import { calculateUPCATScore, estimateUPG } from "../services/scoring";

const SUBTESTS = [
  { key: "Science", label: "Science", items: 60, minutes: 40 },
  { key: "Mathematics", label: "Mathematics", items: 60, minutes: 80 },
  { key: "Reading Comprehension", label: "Reading Comprehension", items: 60, minutes: 40 },
  { key: "Language Proficiency", label: "Language Proficiency", items: 60, minutes: 40 },
];

const PHASE = { INTRO: "intro", GWA: "gwa", LOADING: "loading", EXAM: "exam", BREAK: "break", RESULTS: "results" };

export default function UPCATMock({ onExit }) {
  const [phase, setPhase] = useState(PHASE.INTRO);
  const [hsGWA, setHsGWA] = useState("");
  const [subtestIndex, setSubtestIndex] = useState(0);
  const [questions, setQuestions] = useState([]); // all questions flat
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex | -1 (skipped) }
  const [flagged, setFlagged] = useState({}); // { questionId: bool }
  const [currentItem, setCurrentItem] = useState(0); // index within current subtest
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const timerRef = useRef(null);

  const currentSubtest = SUBTESTS[subtestIndex];

  // Questions for the current subtest
  const subtestQuestions = questions.filter((q) => q.subtestKey === currentSubtest?.key);
  const currentQ = subtestQuestions[currentItem];

  // ── Seed questions for all subtests ──────────────────────────────────────
  async function loadAllQuestions() {
    setIsLoading(true);
    setPhase(PHASE.LOADING);

    // Clear any leftover questions
    await db.questions.clear();

    for (const sub of SUBTESTS) {
      // Seed in batches of 10 until we have enough
      const batches = Math.ceil(sub.items / 10);
      for (let i = 0; i < batches; i++) {
        await seedAlamatDatabase(sub.key, 10, false);
      }
    }

    // Pull and tag questions per subtest
    const all = await db.questions.toArray();
    const tagged = [];
    const usedIds = new Set();

    for (const sub of SUBTESTS) {
      const pool = all.filter((q) => q.subject === sub.key && !usedIds.has(q.id));
      const picked = pool.slice(0, sub.items);
      picked.forEach((q) => {
        usedIds.add(q.id);
        tagged.push({ ...q, subtestKey: sub.key });
      });
    }

    setQuestions(tagged);
    setIsLoading(false);
    setSubtestIndex(0);
    setCurrentItem(0);
    startSubtest(0);
  }

  function startSubtest(idx) {
    const sub = SUBTESTS[idx];
    setTimeLeft(sub.minutes * 60);
    setPhase(PHASE.EXAM);
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.EXAM) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubtestEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, subtestIndex]);

  function handleSubtestEnd() {
    clearInterval(timerRef.current);
    const isLast = subtestIndex === SUBTESTS.length - 1;
    if (isLast) {
      setPhase(PHASE.RESULTS);
    } else {
      setPhase(PHASE.BREAK);
    }
  }

  function proceedToNextSubtest() {
    const next = subtestIndex + 1;
    setSubtestIndex(next);
    setCurrentItem(0);
    setShowFlaggedOnly(false);
    startSubtest(next);
  }

  function handleAnswer(index) {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: index }));
  }

  function toggleFlag() {
    if (!currentQ) return;
    setFlagged((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  }

  // ── Build results ─────────────────────────────────────────────────────────
  function buildResults() {
    return SUBTESTS.map((sub) => {
      const qs = questions.filter((q) => q.subtestKey === sub.key);
      const results = qs.map((q) => {
        const ans = answers[q.id];
        if (ans === undefined) return { isCorrect: false, skipped: true };
        if (ans === -1) return { isCorrect: false, skipped: true };
        return { isCorrect: ans === q.correctIndex, skipped: false };
      });
      const raw = calculateUPCATScore(results);
      const correct = results.filter((r) => r.isCorrect).length;
      const wrong = results.filter((r) => !r.isCorrect && !r.skipped).length;
      const skipped = results.filter((r) => r.skipped).length;
      return { label: sub.label, items: sub.items, raw, correct, wrong, skipped };
    });
  }

  // ── Format timer ──────────────────────────────────────────────────────────
  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" + sec : sec}`;
  }

  const displayItems = showFlaggedOnly
    ? subtestQuestions.filter((q) => flagged[q.id])
    : subtestQuestions;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === PHASE.INTRO) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 flex flex-col items-center justify-center px-6 font-sans">
        <div className="max-w-xl w-full space-y-8 animate-in fade-in zoom-in-95">
          <div>
            <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em] mb-3">Alamat — Mock Exam</p>
            <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">UPCAT<br />Simulator</h1>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-3 text-sm text-slate-400">
            <p className="text-white font-bold text-xs uppercase tracking-widest mb-4">Exam Format</p>
            {SUBTESTS.map((s) => (
              <div key={s.key} className="flex justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span>{s.label}</span>
                <span className="text-slate-500">{s.items} items · {s.minutes} min</span>
              </div>
            ))}
            <div className="pt-3 text-xs text-slate-500 space-y-1 border-t border-white/5">
              <p>• Correct: <span className="text-emerald-400">+1</span> &nbsp; Wrong: <span className="text-rose-400">−0.25</span> &nbsp; Skipped: <span className="text-slate-400">0</span></p>
              <p>• You can flag items and review within the subtest timer.</p>
              <p>• UPG is estimated using 60% UPCAT + 40% HS GWA.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPhase(PHASE.GWA)}
              className="flex-1 py-5 bg-cyan-500 text-black font-black rounded-2xl text-lg uppercase hover:bg-white transition-all"
            >
              Begin Exam
            </button>
            <button
              onClick={onExit}
              className="px-6 py-5 bg-white/5 border border-white/10 text-slate-400 font-bold rounded-2xl hover:bg-white/10 transition-all text-sm"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === PHASE.GWA) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 flex flex-col items-center justify-center px-6 font-sans">
        <div className="max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95">
          <div>
            <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em] mb-3">Step 1 of 1</p>
            <h2 className="text-3xl font-black text-white uppercase italic">Enter HS GWA</h2>
            <p className="text-slate-500 text-sm mt-2">Used to estimate your UPG (1.0 = highest, 5.0 = lowest). Skip to use 3.0.</p>
          </div>
          <input
            type="number"
            min="1"
            max="5"
            step="0.01"
            placeholder="e.g. 1.75"
            value={hsGWA}
            onChange={(e) => setHsGWA(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-xl font-bold focus:outline-none focus:border-cyan-500 transition-all"
          />
          <button
            onClick={loadAllQuestions}
            className="w-full py-5 bg-cyan-500 text-black font-black rounded-2xl text-lg uppercase hover:bg-white transition-all"
          >
            Generate Exam
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASE.LOADING) {
    return (
      <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center gap-6 font-sans">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-cyan-500 font-black text-xs uppercase tracking-[0.3em]">Generating 240 Questions</p>
          <p className="text-slate-600 text-xs mt-1">This may take a moment...</p>
        </div>
      </div>
    );
  }

  if (phase === PHASE.BREAK) {
    const nextSub = SUBTESTS[subtestIndex + 1];
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 flex flex-col items-center justify-center px-6 font-sans">
        <div className="max-w-sm w-full space-y-6 text-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto">
            <span className="text-cyan-400 text-2xl font-black">{subtestIndex + 1}</span>
          </div>
          <div>
            <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em] mb-2">Subtest Complete</p>
            <h2 className="text-3xl font-black text-white uppercase italic">{currentSubtest.label}</h2>
            <p className="text-slate-500 text-sm mt-2">Take a short break before continuing.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left space-y-2 text-sm">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Next Subtest</p>
            <p className="text-white font-bold">{nextSub.label}</p>
            <p className="text-slate-500">{nextSub.items} items · {nextSub.minutes} minutes</p>
          </div>
          <button
            onClick={proceedToNextSubtest}
            className="w-full py-5 bg-cyan-500 text-black font-black rounded-2xl text-lg uppercase hover:bg-white transition-all"
          >
            Start Next Subtest
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASE.RESULTS) {
    const subtestResults = buildResults();
    const totalRaw = subtestResults.reduce((sum, s) => sum + s.raw, 0);
    const totalItems = SUBTESTS.reduce((sum, s) => sum + s.items, 0);
    const gwa = parseFloat(hsGWA) || 3.0;
    const upg = estimateUPG(totalRaw, totalItems, gwa);

    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in zoom-in-95">
          <div>
            <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em] mb-3">Exam Complete</p>
            <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter">Your Results</h1>
          </div>

          {/* UPG Hero */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-[40px] p-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-cyan-500 font-black uppercase tracking-widest mb-2">Estimated UPG</p>
              <p className="text-xs text-slate-500">Based on 60% UPCAT + 40% HS GWA ({gwa.toFixed(2)})</p>
            </div>
            <span className="text-7xl font-black text-white">{upg}</span>
          </div>

          {/* Per-subtest breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subtestResults.map((s) => (
              <div key={s.label} className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{s.label}</p>
                <p className="text-3xl font-black text-white">{s.raw.toFixed(2)} <span className="text-slate-600 text-lg font-normal">/ {s.items}</span></p>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, (s.raw / s.items) * 100)}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="text-emerald-400">✓ {s.correct}</span>
                  <span className="text-rose-400">✗ {s.wrong}</span>
                  <span>— {s.skipped} skipped</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total raw score */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex justify-between items-center">
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Raw Score</p>
            <p className="text-2xl font-black text-white">{totalRaw.toFixed(2)} / {totalItems}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                await db.questions.clear();
                onExit();
              }}
              className="flex-1 py-5 bg-white text-black font-black rounded-2xl text-lg uppercase hover:bg-cyan-400 transition-all"
            >
              Back to Practice
            </button>
            <button
              onClick={async () => {
                await db.questions.clear();
                setAnswers({});
                setFlagged({});
                setPhase(PHASE.GWA);
              }}
              className="flex-1 py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl text-lg uppercase hover:bg-white/10 transition-all"
            >
              Retake Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── EXAM phase ─────────────────────────────────────────────────────────────
  const answered = subtestQuestions.filter((q) => answers[q.id] !== undefined).length;
  const flaggedCount = subtestQuestions.filter((q) => flagged[q.id]).length;

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#05070a]/90 backdrop-blur border-b border-white/5 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-black uppercase text-cyan-500 tracking-widest whitespace-nowrap">
              {subtestIndex + 1}/{SUBTESTS.length}
            </span>
            <span className="text-white font-bold truncate">{currentSubtest.label}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 uppercase font-bold">{answered}/{currentSubtest.items} answered</span>
            <span
              className={`font-mono font-black text-lg ${timeLeft < 120 ? "text-rose-500 animate-pulse" : "text-white"}`}
            >
              {fmt(timeLeft)}
            </span>
            <button
              onClick={handleSubtestEnd}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:bg-white/10 transition-all"
            >
              End Subtest
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-8 gap-8">
        {/* Question area */}
        <div className="flex-1 space-y-8">
          {currentQ ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">
                  Item {currentItem + 1} of {currentSubtest.items}
                </span>
                {flagged[currentQ.id] && (
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Flagged</span>
                )}
              </div>

              {currentQ.visualPrompt && (
                <div className="bg-[#0a0c10] border border-cyan-500/20 rounded-2xl p-5">
                  {/[|\\/_*]/.test(currentQ.visualPrompt) ? (
                    <pre className="font-mono text-cyan-400 text-sm leading-tight overflow-x-auto">{currentQ.visualPrompt}</pre>
                  ) : (
                    <p className="text-cyan-100/70 text-base italic">"{currentQ.visualPrompt}"</p>
                  )}
                </div>
              )}

              <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">{currentQ.question}</h2>

              <div className="grid gap-3 max-w-2xl">
                {(currentQ.options || []).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`w-full p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all
                      ${answers[currentQ.id] === i
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/20"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black border-2 shrink-0
                      ${answers[currentQ.id] === i ? "bg-cyan-500 border-cyan-500 text-black" : "border-white/10 text-slate-500"}`}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-slate-300">{opt}</span>
                  </button>
                ))}
                {/* Skip option */}
                <button
                  onClick={() => handleAnswer(-1)}
                  className={`w-full p-4 rounded-2xl border border-dashed text-sm text-slate-600 hover:text-slate-400 transition-all
                    ${answers[currentQ.id] === -1 ? "border-slate-500 text-slate-400" : "border-white/5"}`}
                >
                  Skip this item (no penalty)
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={toggleFlag}
                  className={`px-5 py-3 rounded-xl border text-[10px] font-black uppercase transition-all
                    ${flagged[currentQ.id]
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-white/10 text-slate-500 hover:border-white/20"}`}
                >
                  {flagged[currentQ.id] ? "Unflag" : "Flag for Review"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-slate-500 italic">No question available for this item.</p>
          )}
        </div>

        {/* Item grid sidebar */}
        <div className="w-64 shrink-0 sticky top-24 self-start space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Item Map</p>
            {flaggedCount > 0 && (
              <button
                onClick={() => setShowFlaggedOnly((v) => !v)}
                className={`text-[10px] font-black uppercase transition-all ${showFlaggedOnly ? "text-amber-400" : "text-slate-600 hover:text-slate-400"}`}
              >
                {showFlaggedOnly ? "Show All" : `Flagged (${flaggedCount})`}
              </button>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {subtestQuestions.map((q, idx) => {
              const isActive = q.id === currentQ?.id;
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== -1;
              const isSkipped = answers[q.id] === -1;
              const isFlagged = flagged[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentItem(idx);
                    setShowFlaggedOnly(false);
                  }}
                  className={`w-full aspect-square rounded-lg text-[10px] font-black transition-all border
                    ${isActive ? "bg-cyan-500 border-cyan-500 text-black" :
                      isFlagged ? "bg-amber-500/20 border-amber-500/60 text-amber-400" :
                      isAnswered ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                      isSkipped ? "bg-white/5 border-white/5 text-slate-600" :
                      "bg-white/[0.02] border-white/5 text-slate-600 hover:border-white/20"}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5 text-[10px] text-slate-600 font-bold uppercase">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-cyan-500 inline-block" /> Current</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500/40 inline-block border border-emerald-500/40" /> Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500/20 inline-block border border-amber-500/60" /> Flagged</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white/5 inline-block border border-white/5" /> Unanswered</div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-[#05070a]/90 backdrop-blur border-t border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            disabled={currentItem === 0}
            onClick={() => setCurrentItem((i) => i - 1)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-sm uppercase disabled:opacity-20 hover:bg-white/10 transition-all"
          >
            ← Prev
          </button>
          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            {currentItem + 1} / {currentSubtest.items}
          </span>
          <button
            disabled={currentItem === subtestQuestions.length - 1}
            onClick={() => setCurrentItem((i) => i + 1)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-sm uppercase disabled:opacity-20 hover:bg-white/10 transition-all"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
