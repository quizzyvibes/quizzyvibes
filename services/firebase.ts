/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot
} from "firebase/firestore";
import { User, QuizResult, Badge, Question } from "../types";
import { BADGES } from "../constants";

// --- CONFIGURATION ---

// Robust helper to get env var from either import.meta.env (Vite) or process.env (Vercel/Node)
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
     // @ts-ignore
     return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
     // @ts-ignore
     return process.env[key];
  }
  return "";
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

// Console check to assist debugging (Keys masked)
console.log("Firebase Config Status:", {
  hasApiKey: !!firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

if (!firebaseConfig.apiKey) {
  console.error("CRITICAL: Firebase API Key is missing. Check Vercel Environment Variables.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- AUTH ---

export const loginWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const userRef = doc(db, "users", fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as User;
    } else {
      const newUser: User = {
        username: fbUser.displayName || "Anonymous",
        email: fbUser.email || `anon_${fbUser.uid}@quizzy.com`,
        joinedAt: new Date().toISOString(),
        badges: [],
        avatar: fbUser.photoURL || undefined
      };
      await setDoc(userRef, newUser);
      return newUser;
    }
  } catch (error) {
    // We throw here so the UI component can display the specific error message
    throw error;
  }
};

export const loginAsGuest = async (): Promise<User> => {
  try {
    const result = await signInAnonymously(auth);
    const fbUser = result.user;
    
    // Guest users don't necessarily need a DB entry immediately, 
    // but we create a local User object for the app state.
    const guestUser: User = {
      username: "Guest Player",
      email: "", // Empty email for guests
      joinedAt: new Date().toISOString(),
      badges: [],
      avatar: undefined 
    };
    
    return guestUser;
  } catch (error) {
    console.error("Guest login failed", error);
    // Fallback if Firebase fails completely
    return {
        username: "Guest Player",
        email: "",
        joinedAt: new Date().toISOString(),
        badges: []
    };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      if (fbUser.isAnonymous) {
          callback({
            username: "Guest Player",
            email: "",
            joinedAt: new Date().toISOString(),
            badges: []
          });
          return;
      }

      const userRef = doc(db, "users", fbUser.uid);
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          callback(snap.data() as User);
        } else {
          // Fallback if auth exists but firestore doc doesn't
          callback({
            username: fbUser.displayName || "User",
            email: fbUser.email || "",
            joinedAt: new Date().toISOString(),
            badges: [],
            avatar: fbUser.photoURL || undefined
          });
        }
      } catch (e) {
         console.warn("Could not fetch user profile", e);
         callback(null);
      }
    } else {
      callback(null);
    }
  });
};

// --- DATA ---

export const saveResultToCloud = async (result: QuizResult) => {
  try {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        // We don't save guest results to cloud permanently in this version
        return { updatedUser: null, newBadges: [] };
    }
    
    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);

    // 1. Save Result
    await addDoc(collection(db, "results"), {
      ...result,
      userId: userId
    });

    // 2. Fetch current user data
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { updatedUser: null, newBadges: [] };
    
    const userData = userSnap.data() as User;
    const previousBadges = new Set(userData.badges);
    
    // 3. Fetch all user results
    const q = query(collection(db, "results"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const userResults = querySnapshot.docs.map(d => d.data() as QuizResult);

    // 4. Calculate Badges
    const newBadges: Badge[] = [];

    if (!previousBadges.has('first_steps') && userResults.length >= 1) 
      newBadges.push(BADGES.find(b => b.id === 'first_steps')!);
    
    if (!previousBadges.has('high_five') && result.percentage >= 50) 
      newBadges.push(BADGES.find(b => b.id === 'high_five')!);

    if (!previousBadges.has('perfectionist') && result.percentage === 100) 
      newBadges.push(BADGES.find(b => b.id === 'perfectionist')!);

    if (!previousBadges.has('brainiac') && userResults.length >= 5) 
      newBadges.push(BADGES.find(b => b.id === 'brainiac')!);

    if (!previousBadges.has('dedicated') && userResults.length >= 10) 
      newBadges.push(BADGES.find(b => b.id === 'dedicated')!);

    // 5. Update User
    if (newBadges.length > 0) {
      const newBadgeIds = newBadges.map(b => b.id);
      await updateDoc(userRef, {
        badges: arrayUnion(...newBadgeIds)
      });
      userData.badges = [...userData.badges, ...newBadgeIds];
    }

    return { updatedUser: userData, newBadges };

  } catch (error) {
    console.error("Error saving result", error);
    return { updatedUser: null, newBadges: [] };
  }
};

export const getUserResultsFromCloud = async (email: string): Promise<QuizResult[]> => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return [];
    
    const q = query(collection(db, "results"), where("userId", "==", auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as QuizResult);
};

export const getCloudLeaderboardData = async () => {
    try {
        const q = query(collection(db, "results"), orderBy("score", "desc"), limit(20));
        const snapshot = await getDocs(q);
        const topScores = snapshot.docs.map(doc => doc.data() as QuizResult);
        return { topScores, rankedUsers: [] }; 
    } catch (e) {
        console.warn("Leaderboard fetch failed (likely missing index or permissions)", e);
        return { topScores: [], rankedUsers: [] };
    }
};

export const updateUserAvatar = async (base64: string) => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, { avatar: base64 });
};

export const getAllUsersFromCloud = async (): Promise<User[]> => {
    try {
        const snapshot = await getDocs(collection(db, "users"));
        return snapshot.docs.map(doc => doc.data() as User);
    } catch (e) {
        return [];
    }
};

export const getAllResultsFromCloud = async (): Promise<QuizResult[]> => {
    try {
        const snapshot = await getDocs(collection(db, "results"));
        return snapshot.docs.map(doc => doc.data() as QuizResult);
    } catch (e) {
        return [];
    }
};

// --- GLOBAL GAME CONFIG (ADMIN SYNC) ---

export interface GlobalConfig {
    questions: Question[]; // Stored as JSON string to avoid depth issues if necessary, or raw array
    fileName: string;
    updatedAt: number;
    activeSubjectIds?: string[];
}

// Admin only function
export const saveGlobalQuizConfig = async (questions: Question[], fileName: string, activeSubjectIds: string[]) => {
    try {
        const configRef = doc(db, "global_config", "main");
        // Firestore has a 1MB limit. 
        // We strip optional heavy fields if needed, but for text questions 1MB is usually plenty (approx 2000 questions).
        await setDoc(configRef, {
            questions: JSON.stringify(questions),
            fileName,
            updatedAt: Date.now(),
            activeSubjectIds
        });
        return true;
    } catch (e) {
        console.error("Failed to sync global config:", e);
        throw e;
    }
};

// All users subscribe
export const subscribeToGlobalConfig = (callback: (config: GlobalConfig | null) => void) => {
    const configRef = doc(db, "global_config", "main");
    return onSnapshot(configRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            try {
                // Parse questions back from string
                const questions = JSON.parse(data.questions);
                callback({
                    questions,
                    fileName: data.fileName,
                    updatedAt: data.updatedAt,
                    activeSubjectIds: data.activeSubjectIds
                });
            } catch (e) {
                console.error("Error parsing global questions", e);
                callback(null);
            }
        } else {
            callback(null);
        }
    });
};


