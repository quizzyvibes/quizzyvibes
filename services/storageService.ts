
import { User, QuizResult, Badge } from '../types';
import { BADGES } from '../constants';

const USERS_KEY = 'quizmaster_users';
const RESULTS_KEY = 'quizmaster_results';
const SESSION_KEY = 'quizmaster_session';
const ADMIN_EMAIL = 'admin@quizzyvibes.com';

// --- Auth Helpers ---

export const registerUser = (email: string, username: string): User => {
  const users = getUsersMap();
  if (users[email]) {
    throw new Error('User already exists');
  }
  const newUser: User = {
    email,
    username,
    joinedAt: new Date().toISOString(),
    badges: []
  };
  users[email] = newUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, email);
  return newUser;
};

export const loginUser = (email: string): User => {
  const users = getUsersMap();
  const normalizedEmail = email.trim();
  let user = users[normalizedEmail];
  
  // SPECIAL LOGIC: Auto-provision Admin if not found
  if (!user && normalizedEmail === ADMIN_EMAIL) {
      user = {
          email: ADMIN_EMAIL,
          username: 'QuizMaster Admin',
          joinedAt: new Date().toISOString(),
          badges: []
      };
      // Save the new admin user to storage immediately
      users[normalizedEmail] = user;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  if (!user) {
    throw new Error('User not found. Please create an account first.');
  }
  
  localStorage.setItem(SESSION_KEY, normalizedEmail);
  return user;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const email = localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  const users = getUsersMap();
  return users[email] || null;
};

export const updateUserProfile = (updatedUser: User): User => {
  const users = getUsersMap();
  if (users[updatedUser.email]) {
    users[updatedUser.email] = updatedUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return updatedUser;
  }
  throw new Error("User not found to update");
};

const getUsersMap = (): Record<string, User> => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const getAllUsers = (): User[] => {
  const usersMap = getUsersMap();
  return Object.values(usersMap);
};

// --- Data Helpers ---

export const saveQuizResult = (result: QuizResult): { updatedUser: User, newBadges: Badge[] } => {
  const results = getAllResults();
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));

  // Check for badges
  const users = getUsersMap();
  const user = users[result.userEmail];
  
  // Safety check if user somehow missing
  if (!user) {
      return { updatedUser: { email: result.userEmail, username: result.username, joinedAt: '', badges: []}, newBadges: [] };
  }

  const userResults = results.filter(r => r.userEmail === result.userEmail);
  const newBadges: Badge[] = [];

  // Badge Logic
  const earnedBadgeIds = new Set(user.badges);

  if (!earnedBadgeIds.has('first_steps') && userResults.length >= 1) {
    newBadges.push(BADGES.find(b => b.id === 'first_steps')!);
  }
  if (!earnedBadgeIds.has('brainiac') && userResults.length >= 5) {
    newBadges.push(BADGES.find(b => b.id === 'brainiac')!);
  }
  if (!earnedBadgeIds.has('dedicated') && userResults.length >= 10) {
    newBadges.push(BADGES.find(b => b.id === 'dedicated')!);
  }
  if (!earnedBadgeIds.has('perfectionist') && result.percentage === 100) {
    newBadges.push(BADGES.find(b => b.id === 'perfectionist')!);
  }
  if (!earnedBadgeIds.has('high_five') && result.percentage >= 50) {
    newBadges.push(BADGES.find(b => b.id === 'high_five')!);
  }
  if (!earnedBadgeIds.has('science_whiz') && result.subject === 'Science' && result.percentage === 100) {
    newBadges.push(BADGES.find(b => b.id === 'science_whiz')!);
  }

  if (newBadges.length > 0) {
    user.badges = [...user.badges, ...newBadges.map(b => b.id)];
    users[user.email] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  return { updatedUser: user, newBadges };
};

export const getAllResults = (): QuizResult[] => {
  const stored = localStorage.getItem(RESULTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const getUserResults = (email: string): QuizResult[] => {
  return getAllResults().filter(r => r.userEmail === email);
};

export const getLeaderboardData = () => {
  const results = getAllResults();
  
  // 1. By Total Score (User Ranking)
  const userScores: Record<string, { username: string, totalScore: number, quizzesPlayed: number }> = {};
  
  results.forEach(r => {
    if (!userScores[r.userEmail]) {
      userScores[r.userEmail] = { username: r.username, totalScore: 0, quizzesPlayed: 0 };
    }
    userScores[r.userEmail].totalScore += r.score;
    userScores[r.userEmail].quizzesPlayed += 1;
  });

  const rankedUsers = Object.values(userScores).sort((a, b) => b.totalScore - a.totalScore);

  // 2. Recent Top Scores (Global)
  const topScores = [...results].sort((a, b) => b.score - a.score).slice(0, 10);

  return { rankedUsers, topScores };
};
