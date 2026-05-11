import Dexie from "dexie";

export const db = new Dexie("ALAMAT_DB");
db.version(4).stores({
  // Bumped from 3 to 4
  questions: "++id, subject, topic, difficulty, seen",
  progress: "topic, subject, correctAttempts, totalAttempts",
});
