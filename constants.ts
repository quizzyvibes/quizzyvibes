
import { SubjectPreset, Difficulty, Badge } from './types';

export const ADMIN_EMAIL = 'admin@quizzyvibes.com';

export const SUBJECT_PRESETS: SubjectPreset[] = [
  // Original
  { id: 'geo', name: 'Geography', icon: 'Globe', description: 'Capitals, landscapes, and maps' },
  { id: 'sci', name: 'Science', icon: 'FlaskConical', description: 'Physics, chemistry, and biology' },
  { id: 'nut', name: 'Nutrition', icon: 'Utensils', description: 'Food, health, and diet' },
  { id: 'tech', name: 'Technology', icon: 'Cpu', description: 'Computers, AI, and innovations' },
  { id: 'math', name: 'Mathematics', icon: 'Calculator', description: 'Logic, algebra, and numbers' },
  { id: 'gen', name: 'General Knowledge', icon: 'Brain', description: 'A bit of everything' },
  // New Additions
  { id: 'pets', name: 'Pets', icon: 'Cat', description: 'Breeds, care, and animal facts' },
  { id: 'astro', name: 'Astronomy', icon: 'Rocket', description: 'Stars, planets, and the cosmos' },
  { id: 'anat', name: 'Anatomy', icon: 'HeartPulse', description: 'The human body and systems' },
  { id: 'music', name: 'Music', icon: 'Music', description: 'Theory, history, and instruments' },
  { id: 'hist', name: 'History', icon: 'Scroll', description: 'Events, eras, and civilizations' },
  { id: 'riddle', name: 'Riddles', icon: 'HelpCircle', description: 'Brain teasers and logic puzzles' },
  { id: 'garden', name: 'Home Gardening', icon: 'Sprout', description: 'Plants, soil, and growing tips' },
  { id: 'cook', name: 'Home Cooking', icon: 'ChefHat', description: 'Recipes, techniques, and flavors' },
];

export const DEFAULT_TIMER_SECONDS = 5; // Default to 5s
export const DEFAULT_QUESTION_COUNT = 10;
export const DEFAULT_DIFFICULTY = Difficulty.EASY;

export const BADGES: Badge[] = [
  { id: 'first_steps', name: 'First Steps', description: 'Complete your first quiz', icon: 'Footprints' },
  { id: 'high_five', name: 'High Five', description: 'Score at least 50% on a quiz', icon: 'HandMetal' },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Achieve a 100% score', icon: 'Crown' },
  { id: 'brainiac', name: 'Brainiac', description: 'Complete 5 quizzes', icon: 'Brain' },
  { id: 'dedicated', name: 'Dedicated', description: 'Complete 10 quizzes', icon: 'Medal' },
  { id: 'science_whiz', name: 'Science Whiz', description: 'Get 100% on a Science quiz', icon: 'FlaskConical' },
];
