import { db } from "../db";

export async function seedAlamatDatabase(subject, count, isHardMode = false) {
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  const difficultyContext = isHardMode
    ? `LEVEL: DIFFICULT. Generate genuinely hard questions that require multi-step reasoning, deep analysis, and synthesis of concepts. Questions should NOT be answerable by recognition alone — they must require working through the problem. Use complex scenarios, tricky edge cases, and plausible-but-wrong distractors that require careful reasoning to eliminate. Avoid straightforward definitional or recall questions.`
    : "LEVEL: STANDARD. Focus on core concepts and speed-accuracy.";

  const examContext = subject.startsWith("Civil Service")
    ? "Philippine Civil Service Examination (CSE) — Professional or Sub-Professional level."
    : "Philippine college entrance exams: UPCAT, ACET, DCAT, USTET, or equivalent.";

  const prompt = `You are an expert exam item writer. Generate ${count} UNIQUE exam questions for ${subject}.
Context: ${examContext}
${difficultyContext}

ACCURACY REQUIREMENTS (most important — items with errors are unacceptable):
1. Each question must have exactly ONE unambiguously correct option. The other 3 must be clearly wrong, not "also defensible".
2. Before finalizing, SOLVE each question yourself step by step. For Math/Numerical, work the arithmetic and confirm the result equals exactly one option.
3. "correctIndex" must be the 0-based index of the correct option in the "options" array. Verify it points at the option you actually solved for — off-by-one errors are a common mistake; double-check it.
4. The "explanation" must justify why the option at correctIndex is correct AND briefly why the other options are wrong. The explanation must be fully consistent with correctIndex — if they disagree, fix the item before returning it.
5. Do not include questions you are not fully confident are correct. Quality over quantity.

Rules for "visualPrompt":
1. If Math/Science/Analytical: Attempt a 5-line ASCII diagram using |, _, /, \, *.
2. If Reading/Language/Filipino: Provide a short "Context Snippet" or "Scenario Description" in the appropriate language.
3. If Abstract Reasoning: Describe a pattern or sequence that the student must continue or identify.
4. NEVER return meta-descriptions like "A diagram of...". Instead, show the data or the drawing.

FINAL CHECK before returning: re-read every item. Confirm correctIndex matches the worked solution and the explanation. Silently fix any mismatch.

Return ONLY JSON (no markdown, no commentary):
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
        model: "google/gemini-2.5-flash",
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
