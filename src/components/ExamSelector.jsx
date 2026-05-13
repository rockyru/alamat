import React from "react";

const EXAMS = [
  {
    key: "upcat",
    label: "UPCAT",
    description: "University of the Philippines College Admission Test",
    subjects: ["Mathematics", "Science", "Reading Comprehension", "Language Proficiency", "Filipino", "Abstract Reasoning"],
    color: "border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10",
    activeColor: "border-cyan-500 bg-cyan-500/15",
    labelColor: "text-cyan-400",
    badge: "border-cyan-500/30 text-cyan-500",
  },
  {
    key: "csc-pro",
    label: "CSC Professional",
    description: "Civil Service Exam — Professional Level",
    subjects: ["Civil Service - Verbal", "Civil Service - Numerical", "Civil Service - Analytical", "General Knowledge"],
    color: "border-orange-500/50 bg-orange-500/5 hover:bg-orange-500/10",
    activeColor: "border-orange-500 bg-orange-500/15",
    labelColor: "text-orange-400",
    badge: "border-orange-500/30 text-orange-500",
  },
  {
    key: "csc-subpro",
    label: "CSC Sub-Professional",
    description: "Civil Service Exam — Sub-Professional Level",
    subjects: ["Civil Service - Verbal", "Civil Service - Numerical", "General Knowledge"],
    color: "border-teal-500/50 bg-teal-500/5 hover:bg-teal-500/10",
    activeColor: "border-teal-500 bg-teal-500/15",
    labelColor: "text-teal-400",
    badge: "border-teal-500/30 text-teal-500",
  },
  {
    key: "all",
    label: "All Subjects",
    description: "Practice across all available topics",
    subjects: ["Mathematics", "Science", "Reading Comprehension", "Language Proficiency", "Filipino", "Abstract Reasoning", "Civil Service - Verbal", "Civil Service - Numerical", "Civil Service - Analytical", "General Knowledge"],
    color: "border-violet-500/50 bg-violet-500/5 hover:bg-violet-500/10",
    activeColor: "border-violet-500 bg-violet-500/15",
    labelColor: "text-violet-400",
    badge: "border-violet-500/30 text-violet-500",
  },
];

export { EXAMS };

export default function ExamSelector({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Exam Type</p>
      <div className="grid grid-cols-2 gap-2">
        {EXAMS.map((exam) => {
          const isActive = selected === exam.key;
          return (
            <button
              key={exam.key}
              onClick={() => onSelect(exam.key)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${isActive ? exam.activeColor : exam.color}`}
            >
              <p className={`text-xs font-black uppercase tracking-widest ${exam.labelColor}`}>{exam.label}</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{exam.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
