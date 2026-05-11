// src/services/scoring.js

export function calculateUPCATScore(results) {
  // results = [{ isCorrect: true, skipped: false }, ...]
  const correct = results.filter((r) => r.isCorrect).length;
  const incorrect = results.filter((r) => !r.isCorrect && !r.skipped).length;

  const rawScore = correct - incorrect * 0.25;
  return Math.max(0, rawScore); // Score can't be negative
}

/**
 * Estimates UPG based on the 60/40 rule
 * 60% UPCAT Score, 40% High School Grades
 */
export function estimateUPG(rawScore, totalQuestions, hsGWA) {
  // Standardizing score to a 1.0 - 5.0 scale (simplified for ALAMAT)
  const scorePercentage = rawScore / totalQuestions;

  // In UP, 1.0 is the best, 5.0 is failing.
  // This is a rough estimation for the "Mock Assessment"
  const upcatComponent = (1 - scorePercentage) * 5;
  const gwaComponent = hsGWA; // Assuming user enters their 1.0-5.0 GWA

  const finalUPG = upcatComponent * 0.6 + gwaComponent * 0.4;
  return finalUPG.toFixed(3);
}
