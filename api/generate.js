import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, count, difficulty, randomSeed } = req.body;

    if (!process.env.API_KEY) {
      throw new Error("Server configuration error: API_KEY is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Difficulty Tuning
    let difficultyDesc = "";
    if (difficulty === "Easy") {
      difficultyDesc = "Intermediate / General Knowledge. (Not childish, but common facts).";
    } else if (difficulty === "Medium") {
      difficultyDesc = "Advanced / College level. Requires specific knowledge.";
    } else {
      difficultyDesc = "Expert / Niche. (Challenging details, but strictly logical and factual. No trick questions).";
    }

    const prompt = `
      Task: Generate a unique quiz about "${topic}".
      Count: ${count} questions.
      Difficulty Level: ${difficultyDesc}
      Random Seed: ${randomSeed || Date.now()} (Use this to vary the questions from previous requests).

      Requirements:
      1. Questions must be DIVERSE. Do not repeat common tropes.
      2. 4 Options per question.
      3. Exactly one correct answer.
      4. Include a brief, interesting explanation.
      5. Output JSON only.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking to reduce latency
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 4 options",
              },
              correctAnswer: { type: Type.STRING, description: "The correct option" },
              explanation: { type: Type.STRING, description: "Explanation" },
            },
            required: ["text", "options", "correctAnswer"],
          },
        },
      },
    });

    const questionsData = JSON.parse(response.text);
    return res.status(200).json(questionsData);

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Failed to generate quiz. Please try again." });
  }
}