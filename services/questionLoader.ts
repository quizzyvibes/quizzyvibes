import { Difficulty, Question } from '../types';

// Import all subject data
import { GEO_QUESTIONS_EASY, GEO_QUESTIONS_MEDIUM, GEO_QUESTIONS_HARD } from '../data/geoQuestions';
import { SCI_QUESTIONS_EASY, SCI_QUESTIONS_MEDIUM, SCI_QUESTIONS_HARD } from '../data/sciQuestions';
import { NUT_QUESTIONS_EASY, NUT_QUESTIONS_MEDIUM, NUT_QUESTIONS_HARD } from '../data/nutQuestions';
import { TECH_QUESTIONS_EASY, TECH_QUESTIONS_MEDIUM, TECH_QUESTIONS_HARD } from '../data/techQuestions';
import { MATH_QUESTIONS_EASY, MATH_QUESTIONS_MEDIUM, MATH_QUESTIONS_HARD } from '../data/mathQuestions';
import { GEN_QUESTIONS_EASY, GEN_QUESTIONS_MEDIUM, GEN_QUESTIONS_HARD } from '../data/genQuestions';

export const loadQuestionsForTopic = (
  topicId: string, 
  difficulty: Difficulty
): Question[] => {
  
  let pool: Question[] = [];

  // Switch based on topic
  switch (topicId) {
    case 'geo':
        if (difficulty === Difficulty.EASY) pool = GEO_QUESTIONS_EASY;
        else if (difficulty === Difficulty.MEDIUM) pool = GEO_QUESTIONS_MEDIUM;
        else pool = GEO_QUESTIONS_HARD;
        break;
    
    case 'sci':
        if (difficulty === Difficulty.EASY) pool = SCI_QUESTIONS_EASY;
        else if (difficulty === Difficulty.MEDIUM) pool = SCI_QUESTIONS_MEDIUM;
        else pool = SCI_QUESTIONS_HARD;
        break;

    case 'nut':
        if (difficulty === Difficulty.EASY) pool = NUT_QUESTIONS_EASY;
        else if (difficulty === Difficulty.MEDIUM) pool = NUT_QUESTIONS_MEDIUM;
        else pool = NUT_QUESTIONS_HARD;
        break;

    case 'tech':
        if (difficulty === Difficulty.EASY) pool = TECH_QUESTIONS_EASY;
        else if (difficulty === Difficulty.MEDIUM) pool = TECH_QUESTIONS_MEDIUM;
        else pool = TECH_QUESTIONS_HARD;
        break;

    case 'math':
        if (difficulty === Difficulty.EASY) pool = MATH_QUESTIONS_EASY;
        else if (difficulty === Difficulty.MEDIUM) pool = MATH_QUESTIONS_MEDIUM;
        else pool = MATH_QUESTIONS_HARD;
        break;

    case 'gen':
        if (difficulty === Difficulty.EASY) pool = GEN_QUESTIONS_EASY;
        else if (difficulty === Difficulty.MEDIUM) pool = GEN_QUESTIONS_MEDIUM;
        else pool = GEN_QUESTIONS_HARD;
        break;

    default:
        console.warn(`Unknown topic: ${topicId}`);
        pool = [];
  }
  
  return pool;
};