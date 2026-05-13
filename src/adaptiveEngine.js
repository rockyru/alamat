import { db } from "./db";

// SRS intervals in questions (not days, since sessions are question-based)
// Wrong answer → resurface after 3 questions, then 7, then 15
const SRS_INTERVALS = [3, 7, 15];

export async function updateProgress(topic, isCorrect, subject) {
  if (!db.progress) return;
  const existing = await db.progress.get(topic);
  if (existing) {
    await db.progress.update(topic, {
      correctAttempts: isCorrect ? existing.correctAttempts + 1 : existing.correctAttempts,
      totalAttempts: existing.totalAttempts + 1,
      subject,
    });
  } else {
    await db.progress.add({ topic, subject, correctAttempts: isCorrect ? 1 : 0, totalAttempts: 1 });
  }
}

// Schedule a wrong question to resurface after `intervalStep` more questions
export async function scheduleReview(questionId, globalCount, intervalStep = 0) {
  const step = Math.min(intervalStep, SRS_INTERVALS.length - 1);
  const nextReviewAt = globalCount + SRS_INTERVALS[step];
  await db.questions.update(questionId, {
    seen: 0,           // mark unseen so it re-enters the pool
    nextReviewAt,
    intervalStep: step + 1,
  });
}

// Get accuracy per subject, return sorted worst-first
export async function getSubjectAccuracy() {
  const progress = await db.progress.toArray();
  const bySubject = {};
  progress.forEach((p) => {
    if (!bySubject[p.subject]) bySubject[p.subject] = { correct: 0, total: 0 };
    bySubject[p.subject].correct += p.correctAttempts;
    bySubject[p.subject].total += p.totalAttempts;
  });
  return Object.entries(bySubject)
    .filter(([, v]) => v.total > 0)
    .map(([subject, v]) => ({ subject, accuracy: v.correct / v.total, total: v.total }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

// Weighted question picker — weak subjects appear more often
// Also surfaces SRS-scheduled questions when globalCount >= nextReviewAt
export async function pickNextQuestion(examSubjects, globalCount) {
  const all = await db.questions.toArray();
  const scoped = examSubjects ? all.filter((q) => examSubjects.includes(q.subject)) : all;

  // 1. SRS due: questions scheduled for review at or before current count
  const srsDue = scoped.filter(
    (q) => q.nextReviewAt !== undefined && q.nextReviewAt <= globalCount && q.seen !== 1
  );
  if (srsDue.length > 0) {
    return srsDue[Math.floor(Math.random() * srsDue.length)];
  }

  // 2. Unseen questions, weighted by subject weakness
  const unseen = scoped.filter((q) => q.seen !== 1 && q.nextReviewAt === undefined);
  if (unseen.length === 0) return null;

  const accuracy = await getSubjectAccuracy();
  const accuracyMap = {};
  accuracy.forEach(({ subject, accuracy: acc }) => { accuracyMap[subject] = acc; });

  // Weight: weak subject (accuracy < 0.6) gets weight 3, moderate gets 2, strong gets 1
  const weighted = [];
  unseen.forEach((q) => {
    const acc = accuracyMap[q.subject] ?? 0.5;
    const weight = acc < 0.5 ? 4 : acc < 0.7 ? 2 : 1;
    for (let i = 0; i < weight; i++) weighted.push(q);
  });

  return weighted[Math.floor(Math.random() * weighted.length)];
}

export async function getWeakestTopic() {
  const all = await db.progress.toArray();
  if (all.length === 0) return null;
  return all.sort((a, b) => a.correctAttempts / a.totalAttempts - b.correctAttempts / b.totalAttempts)[0];
}

// Generate AI diagnosis text per subject based on accuracy
export function getDiagnosisText(subject, accuracy, total) {
  if (total < 3) return "Keep practicing to get a full diagnosis.";
  const pct = Math.round(accuracy * 100);
  if (pct >= 85) return `Strong grasp of ${subject}. Focus on edge cases and time management.`;
  if (pct >= 70) return `Solid foundation in ${subject}. Review careless mistakes — you're close to mastery.`;
  if (pct >= 55) return `Developing in ${subject}. Revisit core formulas and concepts before attempting harder items.`;
  if (pct >= 40) return `${subject} needs significant work. Drill fundamentals daily and use the Weak Topic mode.`;
  return `Critical weakness in ${subject}. Prioritize this immediately — start from the basics.`;
}
