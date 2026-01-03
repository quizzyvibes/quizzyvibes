import { Question } from "../types";

const getDetailedExplanation = async (
  questionText: string,
  correctAnswer: string,
  userAnswer?: string
): Promise<string> => {
  try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText, correctAnswer, userAnswer })
    });

    if (!response.ok) return "Explanation unavailable.";
    
    const data = await response.json();
    return data.explanation;
  } catch (e) {
    console.error(e);
    return "Check your connection for AI explanations.";
  }
};

const generateQuizQuestions = async (
  topic: string,
  count: number,
  difficulty: string
): Promise<Question[]> => {
  try {
    // Generate a random seed to ensure freshness on the backend
    const randomSeed = Math.random().toString(36).substring(7) + Date.now();

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        topic, 
        count, 
        difficulty, 
        randomSeed 
      })
    });

    if (!response.ok) {
      throw new Error("Failed to contact quiz server");
    }

    const data = await response.json();
    
    return data.map((q: any, i: number) => ({
      id: `ai-${Date.now()}-${i}`,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));
  } catch (error) {
    console.error("Generation Error", error);
    throw error;
  }
};

export { generateQuizQuestions, getDetailedExplanation };