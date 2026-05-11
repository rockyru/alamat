import { db } from "../db";

export async function seedAlamatDatabase(subject, count, isHardMode = false) {
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  const difficultyContext = isHardMode
    ? "LEVEL: DIFFICULT. Focus on multi-step reasoning and complex analysis."
    : "LEVEL: STANDARD. Focus on core concepts and speed-accuracy.";

  const prompt = `Generate ${count} UNIQUE exam questions for ${subject}.
${difficultyContext}

Rules for "visualPrompt":
1. If Math/Science: Attempt a 5-line ASCII diagram using |, _, /, \, *.
2. If Reading/Language: Provide a "Context Snippet" or a "Scenario Description".
3. NEVER return meta-descriptions like "A diagram of...". Instead, show the data or the drawing.

Return ONLY JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "...",
      "subject": "${subject}",
      "topic": "...",
      "visualPrompt": "..." 
    }
  ]
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const rawContent = data.choices[0].message.content;

    // CLEANER: Removes Markdown backticks
    const cleanContent = rawContent
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const result = JSON.parse(cleanContent);

    if (result.questions) {
      const processed = result.questions.map((q) => ({ ...q, seen: 0 }));
      await db.questions.bulkAdd(processed);
    }
  } catch (error) {
    console.error("Seeding error:", error);
  }
}
