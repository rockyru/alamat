import React, { useState } from "react";

export default function ReviewMode({ history, onDone }) {
  const wrong = history.filter((h) => !h.isCorrect);
  const [idx, setIdx] = useState(0);

  if (wrong.length === 0) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <div>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-2">Perfect Score</p>
            <h2 className="text-3xl font-black text-white uppercase italic">No Mistakes!</h2>
            <p className="text-slate-500 text-sm mt-2">You answered every question correctly this cycle.</p>
          </div>
          <button
            onClick={onDone}
            className="w-full py-5 bg-cyan-500 text-black font-black rounded-2xl text-lg uppercase hover:bg-white transition-all"
          >
            New Cycle
          </button>
        </div>
      </div>
    );
  }

  const item = wrong[idx];

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1">Review Mode</p>
            <h2 className="text-2xl font-black text-white uppercase italic">Mistakes to Learn</h2>
          </div>
          <span className="text-slate-500 text-sm font-bold">{idx + 1} / {wrong.length}</span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {wrong.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 flex-1 rounded-full transition-all ${i === idx ? "bg-rose-500" : i < idx ? "bg-slate-600" : "bg-white/10"}`}
            />
          ))}
        </div>

        {/* Subject tag */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-rose-500/30 text-rose-400 bg-rose-500/10">
            {item.subject}
          </span>
          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">/ / {item.topic}</span>
        </div>

        {/* Question */}
        <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">{item.question}</h3>

        {/* Options */}
        <div className="grid gap-3">
          {item.options.map((opt, i) => {
            const isCorrect = i === item.correctIndex;
            const wasSelected = i === item.selectedIndex;
            return (
              <div
                key={i}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4
                  ${isCorrect ? "border-emerald-500 bg-emerald-500/10" :
                    wasSelected ? "border-rose-500/50 bg-rose-500/10" :
                    "border-white/5 bg-white/[0.02]"}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black border-2 shrink-0
                  ${isCorrect ? "bg-emerald-500 border-emerald-500 text-black" :
                    wasSelected ? "bg-rose-500/30 border-rose-500/50 text-rose-300" :
                    "border-white/10 text-slate-500"}`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
                <span className={`${isCorrect ? "text-emerald-300 font-bold" : wasSelected ? "text-rose-300" : "text-slate-500"}`}>
                  {opt}
                </span>
                {isCorrect && <span className="ml-auto text-[10px] font-black text-emerald-400 uppercase tracking-widest">Correct</span>}
                {wasSelected && !isCorrect && <span className="ml-auto text-[10px] font-black text-rose-400 uppercase tracking-widest">Your Answer</span>}
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Explanation</p>
          <p className="text-slate-300 leading-relaxed italic">"{item.explanation}"</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            disabled={idx === 0}
            onClick={() => setIdx((i) => i - 1)}
            className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase disabled:opacity-20 hover:bg-white/10 transition-all"
          >
            ← Prev
          </button>
          {idx < wrong.length - 1 ? (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase hover:bg-white/10 transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onDone}
              className="flex-1 py-4 bg-cyan-500 text-black font-black rounded-2xl text-sm uppercase hover:bg-white transition-all"
            >
              Start New Cycle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
