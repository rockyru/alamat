import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

export async function fetchAIQuestions(subject) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `Generate 5 UPCAT-style multiple choice questions for ${subject}. 
  Return a JSON array of objects with: question, options (array), correctIndex (0-3), explanation, and language (English/Filipino).`;

  const result = await model.generateContent(prompt);
  const data = JSON.parse(result.response.text());

  // Save to local IndexedDB immediately
  await db.questions.bulkAdd(data);
  return data;
}
