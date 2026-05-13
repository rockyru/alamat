import Dexie from "dexie";

export const db = new Dexie("ALAMAT_DB");
db.version(4).stores({
  questions: "++id, subject, topic, difficulty, seen",
  progress: "topic, subject, correctAttempts, totalAttempts",
});
// v5: adds nextReviewAt for spaced repetition, intervalStep for SRS scheduling
db.version(5).stores({
  questions: "++id, subject, topic, difficulty, seen, nextReviewAt",
  progress: "topic, subject, correctAttempts, totalAttempts",
}).upgrade(() => {});
