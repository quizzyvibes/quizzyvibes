import { QuestionBank, Difficulty } from '../types';
import { GEO_QUESTIONS_EASY, GEO_QUESTIONS_MEDIUM, GEO_QUESTIONS_HARD } from './geoQuestions';

export const STATIC_QUESTION_BANKS: QuestionBank[] = [
  // --- New Geography Banks ---
  {
    id: 'geo-easy-1400',
    title: 'Geography (Easy)',
    description: 'Beginner level questions from the grand archive.',
    difficulty: Difficulty.EASY,
    questions: GEO_QUESTIONS_EASY.length > 0 ? GEO_QUESTIONS_EASY : [
      { id: 'placeholder-1', text: 'Questions not loaded yet', options: ['A','B'], correctAnswer: 'A'}
    ]
  },
  {
    id: 'geo-med-1400',
    title: 'Geography (Medium)',
    description: 'Standard difficulty geography questions.',
    difficulty: Difficulty.MEDIUM,
    questions: GEO_QUESTIONS_MEDIUM
  },
  {
    id: 'geo-hard-1400',
    title: 'Geography (Hard)',
    description: 'Expert level geography challenges.',
    difficulty: Difficulty.HARD,
    questions: GEO_QUESTIONS_HARD
  },

  // --- Existing Sample Banks ---
  {
    id: 'official-science-1',
    title: 'General Science Starter',
    description: 'A mix of biology, chemistry, and physics basics.',
    difficulty: Difficulty.EASY,
    questions: [
      {
        id: 'sci-1',
        text: 'What constitutes the center of an atom?',
        options: ['Electrons', 'Protons and Neutrons', 'Only Protons', 'Only Neutrons'],
        correctAnswer: 'Protons and Neutrons',
        explanation: 'The nucleus of an atom consists of protons and neutrons, while electrons orbit around it.'
      },
      {
        id: 'sci-2',
        text: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
        correctAnswer: 'Mars',
        explanation: 'Mars appears red due to iron oxide (rust) on its surface.'
      },
      {
        id: 'sci-3',
        text: 'What is the chemical symbol for Gold?',
        options: ['Au', 'Ag', 'Fe', 'Go'],
        correctAnswer: 'Au',
        explanation: 'Au comes from the Latin word for gold, "Aurum".'
      },
      {
        id: 'sci-4',
        text: 'What gas do plants absorb from the atmosphere for photosynthesis?',
        options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
        correctAnswer: 'Carbon Dioxide',
        explanation: 'Plants take in Carbon Dioxide and release Oxygen.'
      },
      {
        id: 'sci-5',
        text: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Cytoplasm'],
        correctAnswer: 'Mitochondria',
        explanation: 'Mitochondria generate most of the chemical energy needed to power the cell.'
      }
    ]
  },
  {
    id: 'official-history-1',
    title: 'World History Trivia',
    description: 'Major events and figures from the past.',
    difficulty: Difficulty.MEDIUM,
    questions: [
      {
        id: 'hist-1',
        text: 'Who was the first President of the United States?',
        options: ['Thomas Jefferson', 'Abraham Lincoln', 'George Washington', 'John Adams'],
        correctAnswer: 'George Washington',
        explanation: 'George Washington served as the first U.S. president from 1789 to 1797.'
      },
      {
        id: 'hist-2',
        text: 'In which year did the Titanic sink?',
        options: ['1905', '1912', '1915', '1920'],
        correctAnswer: '1912',
        explanation: 'The Titanic sank in the North Atlantic Ocean on April 15, 1912.'
      },
      {
        id: 'hist-3',
        text: 'Which ancient civilization built the pyramids?',
        options: ['Romans', 'Greeks', 'Egyptians', 'Mayans'],
        correctAnswer: 'Egyptians',
        explanation: 'The ancient Egyptians built the pyramids as tombs for their pharaohs.'
      }
    ]
  }
];