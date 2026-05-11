// src/components/ResultsView.jsx
import { estimateUPG, calculateUPCATScore } from "../services/scoring";

export default function ResultsView({ userAnswers, totalItems, hsGWA }) {
  const score = calculateUPCATScore(userAnswers);
  const upg = estimateUPG(score, totalItems, hsGWA);

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-2xl border-t-8 border-cyan-500">
      <h1 className="text-3xl font-black text-slate-900 mb-2">Assessment Results</h1>
      <p className="text-slate-500 text-sm mb-8 uppercase tracking-widest">Performance Summary</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase">Raw Score</p>
          <p className="text-2xl font-bold text-slate-800">
            {score} / {totalItems}
          </p>
        </div>
        <div className="bg-cyan-50 p-4 rounded-2xl">
          <p className="text-xs text-cyan-600 uppercase">Estimated UPG</p>
          <p className="text-2xl font-bold text-cyan-700">{upg}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>Correct Answers</span>
          <span className="text-green-600 font-bold">+{userAnswers.filter((a) => a.isCorrect).length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Incorrect (Penalty applied)</span>
          <span className="text-red-500 font-bold">-{userAnswers.filter((a) => !a.isCorrect && !a.skipped).length * 0.25}</span>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
      >
        Try Another Subject
      </button>
    </div>
  );
}
