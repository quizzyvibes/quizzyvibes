import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser 
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
  arrayUnion
} from "firebase/firestore";
import { User, QuizResult, Badge } from "../types";
import { BADGES } from "../constants";

// --- CONFIGURATION ---

// Robust helper to get env variables across different environments (Vite, simplified builds, etc)
const getEnv = (key: string): string => {
  // Try import.meta.env (Vite standard)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  
  // Try process.env (Polyfilled via vite.config.ts define)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key];
  }

  // Debug log if missing (only in dev)
  console.warn(`Missing config: ${key}`);
  return '';
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

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
        email: fbUser.email || "",
        joinedAt: new Date().toISOString(),
        badges: [],
        avatar: fbUser.photoURL || undefined
      };
      await setDoc(userRef, newUser);
      return newUser;
    }
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

// Listen for auth changes (Reloads app state when user logs in/out)
export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const userRef = doc(db, "users", fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        callback(snap.data() as User);
      } else {
        // Fallback for edge cases
        callback({
          username: fbUser.displayName || "User",
          email: fbUser.email || "",
          joinedAt: new Date().toISOString(),
          badges: [],
          avatar: fbUser.photoURL || undefined
        });
      }
    } else {
      callback(null);
    }
  });
};

// --- DATA ---

export const saveResultToCloud = async (result: QuizResult) => {
  try {
    if (!auth.currentUser) return { updatedUser: null, newBadges: [] };
    
    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);

    // 1. Save Result Document
    await addDoc(collection(db, "results"), {
      ...result,
      userId: userId
    });

    // 2. Fetch current user data to calc badges
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { updatedUser: null, newBadges: [] };
    
    const userData = userSnap.data() as User;
    const previousBadges = new Set(userData.badges);
    
    // 3. Fetch all user results to calc cumulative badges
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

    // 5. Update User if badges earned
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
    if (!auth.currentUser) return [];
    
    const q = query(collection(db, "results"), where("userId", "==", auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as QuizResult);
};

export const getCloudLeaderboardData = async () => {
    // Top 20 scores globally
    const q = query(collection(db, "results"), orderBy("score", "desc"), limit(20));
    const snapshot = await getDocs(q);
    const topScores = snapshot.docs.map(doc => doc.data() as QuizResult);
    return { topScores, rankedUsers: [] }; 
};

export const updateUserAvatar = async (base64: string) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, { avatar: base64 });
};
