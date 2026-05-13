import Dexie from "dexie";

export const db = new Dexie("ALAMAT_DB");
db.version(5).stores({
  questions: "++id, subject, topic, difficulty, seen, nextReviewAt",
  progress: "topic, subject, correctAttempts, totalAttempts",
});
