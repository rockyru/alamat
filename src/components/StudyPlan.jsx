import React, { useState, useEffect } from "react";
import { db } from "../db";
import { seedAlamatDatabase } from "../services/generator";

const SUBJECT_HOURS = {
  Mathematics: 3,
  Science: 2.5,
  "Reading Comprehension": 2,
  "Language Proficiency": 1.5,
  Filipino: 1.5,
  "Abstract Reasoning": 2,
  "General Knowledge": 1,
  "Civil Service - Verbal": 2,
  "Civil Service - Numerical": 2.5,
  "Civil Service - Analytical": 2,
};

const SUBJECT_COLORS = {
  Mathematics: "bg-blue-500/20 border-blue-500/30 text-blue-400",
  Science: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
  "Reading Comprehension": "bg-amber-500/20 border-amber-500/30 text-amber-400",
  "Language Proficiency": "bg-purple-500/20 border-purple-500/30 text-purple-400",
  Filipino: "bg-rose-500/20 border-rose-500/30 text-rose-400",
  "Abstract Reasoning": "bg-violet-500/20 border-violet-500/30 text-violet-400",
  "General Knowledge": "bg-cyan-500/20 border-cyan-500/30 text-cyan-400",
  "Civil Service - Verbal": "bg-orange-500/20 border-orange-500/30 text-orange-400",
  "Civil Service - Numerical": "bg-teal-500/20 border-teal-500/30 text-teal-400",
  "Civil Service - Analytical": "bg-pink-500/20 border-pink-500/30 text-pink-400",
};

function generatePlan(weakSubjects, allSubjects, examDate, hoursPerDay) {
  const today = new Date();
  const exam = new Date(examDate);
  const daysLeft = Math.max(1, Math.floor((exam - today) / (1000 * 60 * 60 * 24)));

  // Assign weights: weak subjects get 2x time
  const weights = {};
  allSubjects.forEach((s) => { weights[s] = weakSubjects.includes(s) ? 2 : 1; });
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // Distribute total available hours
  const totalHours = daysLeft * hoursPerDay;
  const allocation = {};
  allSubjects.forEach((s) => {
    allocation[s] = Math.max(1, Math.round((weights[s] / totalWeight) * totalHours));
  });

  // Build daily schedule — cycle through subjects weighted by allocation
  const queue = [];
  allSubjects.forEach((s) => {
    const days = Math.ceil(allocation[s] / hoursPerDay);
    for (let i = 0; i < days; i++) queue.push(s);
  });

  // Sort so weak subjects are front-loaded
  queue.sort((a, b) => (weakSubjects.includes(b) ? 1 : 0) - (weakSubjects.includes(a) ? 1 : 0));

  const schedule = [];
  for (let i = 0; i < Math.min(daysLeft, 60); i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const subject = queue[i % queue.length];
    const isWeak = weakSubjects.includes(subject);
    schedule.push({
      day: i + 1,
      date: date.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }),
      subject,
      hours: isWeak ? Math.min(hoursPerDay, SUBJECT_HOURS[subject] || 2) : Math.max(1, hoursPerDay - 1),
      isWeak,
      focus: isWeak ? "Deep practice + error review" : "Core concepts + timed drills",
    });
  }

  return { schedule, allocation, daysLeft, totalHours };
}

export default function StudyPlan({ examKey, onBack }) {
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [plan, setPlan] = useState(null);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadProgress() {
      const progress = await db.progress.toArray();
      const bySubject = {};
      progress.forEach((p) => {
        if (!bySubject[p.subject]) bySubject[p.subject] = { correct: 0, total: 0 };
        bySubject[p.subject].correct += p.correctAttempts;
        bySubject[p.subject].total += p.totalAttempts;
      });
      const sorted = Object.entries(bySubject)
        .filter(([, v]) => v.total >= 2)
        .sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total);
      setWeakSubjects(sorted.slice(0, 3).map(([s]) => s));
      setAllSubjects(Object.keys(bySubject));
    }
    loadProgress();
  }, []);

  function handleGenerate() {
    if (!examDate) return;
    setIsGenerating(true);
    setTimeout(() => {
      const subjects = allSubjects.length > 0 ? allSubjects : ["Mathematics", "Science", "Reading Comprehension", "Language Proficiency"];
      const result = generatePlan(weakSubjects, subjects, examDate, hoursPerDay);
      setPlan(result);
      setIsGenerating(false);
    }, 600);
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95">
          <div>
            <button onClick={onBack} className="text-slate-600 hover:text-white text-sm font-bold mb-6 block transition-all">← Back</button>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] mb-2">ALAMAT AI</p>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Study Plan</h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Set your exam date and available hours. ALAMAT will front-load your weak subjects and build a personalized day-by-day schedule.
            </p>
          </div>

          {weakSubjects.length > 0 && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Detected Weak Topics</p>
              <div className="flex flex-wrap gap-2">
                {weakSubjects.map((s) => (
                  <span key={s} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${SUBJECT_COLORS[s] || "bg-white/5 border-white/10 text-slate-400"}`}>
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-600">These will receive 2× more study time.</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Exam Date</label>
              <input
                type="date"
                value={examDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">
                Hours per Day — <span className="text-emerald-400">{hoursPerDay}h</span>
              </label>
              <input
                type="range"
                min={1}
                max={8}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                <span>1h</span><span>8h</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!examDate || isGenerating}
            className="w-full py-5 bg-emerald-500 text-black font-black rounded-2xl text-lg uppercase hover:bg-white transition-all disabled:opacity-40"
          >
            {isGenerating ? "Generating..." : "Generate My Plan"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] mb-2">Your Study Plan</p>
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">{plan.daysLeft} Days</h2>
            <p className="text-slate-500 text-sm mt-1">{plan.totalHours}h total · {hoursPerDay}h/day</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPlan(null)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase text-slate-400 hover:bg-white/10 transition-all">
              Edit
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase text-slate-400 hover:bg-white/10 transition-all">
              Back
            </button>
          </div>
        </div>

        {/* Allocation summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(plan.allocation).map(([subject, hours]) => (
            <div key={subject} className={`p-4 rounded-2xl border ${SUBJECT_COLORS[subject] || "bg-white/5 border-white/10 text-slate-400"}`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{subject}</p>
              <p className="text-xl font-black mt-1">{hours}h</p>
              {weakSubjects.includes(subject) && (
                <p className="text-[9px] font-bold uppercase opacity-60 mt-0.5">Priority ↑</p>
              )}
            </div>
          ))}
        </div>

        {/* Daily schedule */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Day-by-Day Schedule</p>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {plan.schedule.map((day) => (
              <div
                key={day.day}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  day.isWeak
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-white/[0.02] border-white/5"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-slate-500">{day.day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-white truncate">{day.subject}</p>
                    {day.isWeak && <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest shrink-0">Weak</span>}
                  </div>
                  <p className="text-[10px] text-slate-500">{day.focus}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-white">{day.hours}h</p>
                  <p className="text-[10px] text-slate-600">{day.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
