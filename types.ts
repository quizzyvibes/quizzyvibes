
export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string; // Static explanation from Excel
  subject?: string;     // Parsed from Excel
  difficulty?: string;  // Parsed from Excel
}

export interface QuestionBank {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  questions: Question[];
}

export interface QuizConfig {
  subject: string;
  difficulty: Difficulty;
  questionCount: number;
  timerSeconds: number;
  questions: Question[];
  lifelinesEnabled: boolean; // New toggle
}

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  answers: Record<number, string>;
  isFinished: boolean;
  timeRemaining: number;
  startTime: number;
  lifelinesUsed: {
    fiftyFifty: boolean;
    timeFreeze: boolean;
  };
}

export interface SubjectPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface User {
  username: string;
  email: string;
  joinedAt: string;
  badges: string[];
  avatar?: string; // Base64 string of the user image
}

export interface QuizResult {
  id: string;
  userEmail: string;
  username: string;
  subject: string;
  score: number;
  totalQuestions: number;
  difficulty: Difficulty;
  date: string;
  percentage: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}
