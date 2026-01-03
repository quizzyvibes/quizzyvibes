import { GoogleGenAI } from "@google/genai";

// Endpoint to generate a detailed explanation for a specific question
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questionText, correctAnswer, userAnswer } = req.body;

    if (!process.env.API_KEY) {
      throw new Error("API_KEY missing");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prompt for a concise but detailed educational explanation
    const prompt = `
      The user just answered a quiz question.
      Question: "${questionText}"
      Correct Answer: "${correctAnswer}"
      
      Provide a helpful, educational explanation (approx 30-50 words) about why this answer is correct and add a fun fact related to the topic.
      Be encouraging.
      Return ONLY the explanation text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const explanation = response.text;
    return res.status(200).json({ explanation });

  } catch (error) {
    console.error("Explain API Error:", error);
    return res.status(500).json({ error: "Could not generate explanation" });
  }
}
