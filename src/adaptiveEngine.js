import { db } from "./db";

/**
 * Updates the user's progress for a specific topic in the progress table.
 */
export async function updateProgress(topic, isCorrect, subject) {
  if (!db.progress) return;

  const existing = await db.progress.get(topic);

  if (existing) {
    await db.progress.update(topic, {
      correctAttempts: isCorrect ? existing.correctAttempts + 1 : existing.correctAttempts,
      totalAttempts: existing.totalAttempts + 1,
      subject: subject,
    });
  } else {
    await db.progress.add({
      topic,
      subject,
      correctAttempts: isCorrect ? 1 : 0,
      totalAttempts: 1,
    });
  }
}

/**
 * Helper function to find the weakest topic.
 * Added to resolve the import error in App.jsx.
 */
export async function getWeakestTopic() {
  if (!db.progress) return null;
  const all = await db.progress.toArray();
  if (all.length === 0) return null;

  return all.sort((a, b) => a.correctAttempts / a.totalAttempts - b.correctAttempts / b.totalAttempts)[0];
}
