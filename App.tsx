
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Brain, ArrowRight, RefreshCw, Trophy, XCircle, Sparkles,
  Globe, FlaskConical, Utensils, Calculator, Cpu, AlertCircle, FileSpreadsheet, CheckCircle2,
  Cat, Rocket, HeartPulse, Music, Scroll, HelpCircle, Sprout, ChefHat, ChevronLeft, ChevronRight,
  Share2, Link as LinkIcon, Facebook, Twitter, Linkedin, Mail, MessageCircle,
  Zap, Snowflake, Eye, Check, X
} from 'lucide-react';

import Button from './components/Button';
import QuizCard from './components/QuizCard';
import SettingsPanel from './components/SettingsPanel';
import AuthForm from './components/AuthForm';
import Navbar from './components/Navbar';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard'; // New Import

import { getCurrentUser, logoutUser, saveQuizResult } from './services/storageService';
import { loadQuestionsForTopic } from './services/questionLoader';
import { parseQuestionFile } from './services/fileService';
import { SUBJECT_PRESETS, DEFAULT_QUESTION_COUNT, DEFAULT_TIMER_SECONDS, DEFAULT_DIFFICULTY } from './constants';
import { QuizConfig, QuizState, User, Badge, Question, Difficulty } from './types';

const ICON_MAP: Record<string, React.ElementType> = {
  Brain, Globe, FlaskConical, Utensils, Calculator, Cpu,
  Cat, Rocket, HeartPulse, Music, Scroll, HelpCircle, Sprout, ChefHat
};

const ADMIN_EMAIL = 'admin@quizzyvibes.com';
const CATEGORY_STORAGE_KEY = 'quizmaster_active_categories';

// Default Audio - Using a highly reliable royalty-free link for default music
const DEFAULT_BG_MUSIC = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=cyberpunk-2099-10586.mp3"; 

// Simple Confetti Component
const Confetti = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-20px`,
            backgroundColor: ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'][Math.floor(Math.random() * 5)],
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: Math.random(),
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation-name: confetti;
          animation-timing-function: ease-out;
          animation-iteration-count: 1;
        }
      `}</style>
    </div>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'welcome' | 'quiz' | 'result' | 'profile' | 'leaderboard' | 'review' | 'admin'>('welcome');
  const [error, setError] = useState<string | null>(null);
  
  // Category State
  const [activeSubjectIds, setActiveSubjectIds] = useState<string[]>([]);
  const [categoryPage, setCategoryPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  // Refs
  const settingsRef = useRef<HTMLDivElement>(null);

  // Audio State - Music Defaults to TRUE, SFX Defaults to FALSE
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Custom Audio State
  const [customAudio, setCustomAudio] = useState<{
    music: string | null;
    tick: string | null;
    finish: string | null;
  }>({ music: null, tick: null, finish: null });
  
  const [customAudioNames, setCustomAudioNames] = useState<{
    music?: string;
    tick?: string;
    finish?: string;
  }>({});

  // --- New Admin Control States ---
  const [isConfigLocked, setIsConfigLocked] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Question[] | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  // Track if the uploaded file has "Subject" columns, allowing us to enable the UI selector
  const [hasCustomSubjects, setHasCustomSubjects] = useState(false);

  // Lifeline State
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [isTimeFrozen, setIsTimeFrozen] = useState(false);


  // Audio Refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const customTickRef = useRef<HTMLAudioElement | null>(null);
  const customFinishRef = useRef<HTMLAudioElement | null>(null);

  // FIX: Safely check for admin status using optional chaining on the property access
  const isAdmin = currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    // Initialize Active Categories
    const storedCats = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (storedCats) {
      setActiveSubjectIds(JSON.parse(storedCats));
    } else {
      // Default: First 6 subjects are active
      const defaults = SUBJECT_PRESETS.slice(0, 6).map(s => s.id);
      setActiveSubjectIds(defaults);
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(defaults));
    }
  }, []);

  const handleToggleSubject = (subjectId: string) => {
    let newIds;
    if (activeSubjectIds.includes(subjectId)) {
      newIds = activeSubjectIds.filter(id => id !== subjectId);
    } else {
      newIds = [...activeSubjectIds, subjectId];
    }
    setActiveSubjectIds(newIds);
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(newIds));
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  // Initialize Music
  useEffect(() => {
    // Setup initial default music
    bgMusicRef.current = new Audio(DEFAULT_BG_MUSIC);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.5;

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  // Update Music Source when custom changes
  useEffect(() => {
    if (bgMusicRef.current) {
        const wasPlaying = !bgMusicRef.current.paused;
        bgMusicRef.current.src = customAudio.music || DEFAULT_BG_MUSIC;
        if (wasPlaying) {
            bgMusicRef.current.play().catch(console.warn);
        }
    }
  }, [customAudio.music]);

  // Handle Custom Audio Uploads
  const handleUploadAudio = (type: 'music' | 'tick' | 'finish', file: File) => {
    const url = URL.createObjectURL(file);
    setCustomAudio(prev => ({ ...prev, [type]: url }));
    setCustomAudioNames(prev => ({ ...prev, [type]: file.name }));

    if (type === 'tick') {
        customTickRef.current = new Audio(url);
    } else if (type === 'finish') {
        customFinishRef.current = new Audio(url);
    }
  };

  // Handle Remove Custom Audio
  const handleRemoveAudio = (type: 'music' | 'tick' | 'finish') => {
    if (customAudio[type]) {
        URL.revokeObjectURL(customAudio[type]!);
    }
    
    setCustomAudio(prev => ({ ...prev, [type]: null }));
    setCustomAudioNames(prev => ({ ...prev, [type]: undefined }));

    if (type === 'tick') {
        customTickRef.current = null;
    } else if (type === 'finish') {
        customFinishRef.current = null;
    } else if (type === 'music' && bgMusicRef.current) {
        // Revert to default music URL immediately
        bgMusicRef.current.src = DEFAULT_BG_MUSIC;
        if (musicEnabled && view === 'quiz') {
            bgMusicRef.current.play().catch(console.warn);
        }
    }
  };

  // --- Excel Question Upload Handlers ---
  const handleUploadQuestions = async (file: File) => {
    try {
      const questions = await parseQuestionFile(file);
      setCustomQuestions(questions);
      setCustomFileName(file.name);
      
      // Check if any questions have a subject tag
      const hasSubjects = questions.some(q => !!q.subject);
      setHasCustomSubjects(hasSubjects);

      // If generic file (no subjects), set count to file length to ensure they see how many Qs
      if (!hasSubjects) {
          setConfig(prev => ({ ...prev, questionCount: Math.min(questions.length, 50) }));
      }
      
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemoveQuestions = () => {
    setCustomQuestions(null);
    setCustomFileName(null);
    setHasCustomSubjects(false);
    setConfig(prev => ({ ...prev, questionCount: DEFAULT_QUESTION_COUNT }));
  };


  // --- Audio Player Helpers ---

  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    
    // Only play if custom tick is uploaded
    if (customAudio.tick && customTickRef.current) {
        customTickRef.current.currentTime = 0;
        customTickRef.current.play().catch(e => console.warn("Tick play error", e));
    }
  }, [soundEnabled, customAudio.tick]);

  const playFinishSound = useCallback(() => {
    if (!soundEnabled) return;

    // Only play if custom finish is uploaded
    if (customAudio.finish && customFinishRef.current) {
        customFinishRef.current.currentTime = 0;
        customFinishRef.current.play().catch(console.warn);
    }
  }, [soundEnabled, customAudio.finish]);


  // Config State - DEFAULT SUBJECT IS EMPTY
  const [config, setConfig] = useState<QuizConfig>({
    subject: '', 
    difficulty: DEFAULT_DIFFICULTY,
    questionCount: DEFAULT_QUESTION_COUNT,
    timerSeconds: DEFAULT_TIMER_SECONDS,
    questions: [],
    lifelinesEnabled: true // Default enabled
  });

  // Quiz Runtime State
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    score: 0,
    answers: {},
    isFinished: false,
    timeRemaining: 0,
    startTime: 0,
    lifelinesUsed: { fiftyFifty: false, timeFreeze: false }
  });

  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);

  const resetQuiz = () => {
    setView('welcome');
    setQuizState({
      currentQuestionIndex: 0,
      score: 0,
      answers: {},
      isFinished: false,
      timeRemaining: 0,
      startTime: 0,
      lifelinesUsed: { fiftyFifty: false, timeFreeze: false }
    });
    setHiddenOptions([]);
    setIsTimeFrozen(false);
    setError(null);
    setEarnedBadges([]);
    
    // Stop music
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    resetQuiz();
  };

  const handleSubjectSelect = (subjectId: string) => {
    setConfig(prev => ({ ...prev, subject: subjectId }));
    setError(null); // Clear any previous "please select" errors
    
    // Smooth scroll to settings
    setTimeout(() => {
      if (settingsRef.current) {
        // Calculate offset to ensure header isn't covered
        const yOffset = -100; 
        const element = settingsRef.current;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        
        window.scrollTo({top: y, behavior: 'smooth'});
      }
    }, 100);
  };

  // --- Audio Logic for Music ---
  useEffect(() => {
    const bgMusic = bgMusicRef.current;
    if (!bgMusic) return;

    if (view === 'quiz' && musicEnabled) {
       const playPromise = bgMusic.play();
       if (playPromise !== undefined) {
           playPromise.catch(error => {
               console.log("Auto-play prevented (user interaction needed):", error);
           });
       }
    } else {
      bgMusic.pause();
    }
  }, [musicEnabled, view]);

  // Handle Ticking Sound (Last 5 seconds)
  useEffect(() => {
    if (view === 'quiz' && config.timerSeconds > 0) {
      // Play tick on 5, 4, 3, 2, 1
      if (quizState.timeRemaining <= 5 && quizState.timeRemaining > 0 && !isTimeFrozen) {
         playTick();
      }
      // Play Ding on 0
      if (quizState.timeRemaining === 0) {
          playFinishSound();
      }
    }
  }, [quizState.timeRemaining, view, config.timerSeconds, playTick, playFinishSound, isTimeFrozen]);


  // Robust Timer Effect - Reset when Question Index Changes
  useEffect(() => {
     // Don't run if not in quiz mode or timer disabled
     if (view !== 'quiz' || config.timerSeconds === 0) return;

     // Force Reset time when question changes (caught by dependency quizState.currentQuestionIndex)
     // BUT, we only want to set the initial time once per question, not on every render.
     // However, the state update logic for handleNext sets the timeRemaining.
     // This effect is purely for the COUNTDOWN.

     const interval = setInterval(() => {
        if (!isTimeFrozen) {
            setQuizState(prev => {
                // If answer provided, stop counting (UI preference, though logic handled elsewhere)
                if (prev.answers[prev.currentQuestionIndex]) {
                    return prev;
                }

                if (prev.timeRemaining <= 0) {
                    clearInterval(interval);
                    return prev;
                }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
        }
     }, 1000);

     return () => clearInterval(interval);
  }, [view, isTimeFrozen, config.timerSeconds, quizState.currentQuestionIndex]); 

  // Handle Timeout
  useEffect(() => {
    const isAnswered = quizState.answers[quizState.currentQuestionIndex] !== undefined;
    if (config.timerSeconds > 0 && quizState.timeRemaining === 0 && !isAnswered && view === 'quiz') {
       handleAnswer('TIMEOUT');
    }
  }, [quizState.timeRemaining, quizState.answers, quizState.currentQuestionIndex, view, config.timerSeconds]);

  const handleStartQuiz = () => {
    setError(null);

    // Validate Selection
    if (!config.subject && !customQuestions) {
        setError("Please select a quiz category to start!");
        return;
    }

    let selectedQuestions: Question[] = [];

    // --- Override Logic: Check Custom Questions First ---
    if (customQuestions && customQuestions.length > 0) {
        // SMART FILTERING
        let filteredPool = customQuestions;

        // 1. Filter by Subject (if file supports it)
        if (hasCustomSubjects) {
            filteredPool = filteredPool.filter(q => q.subject === config.subject);
        }

        // 2. Filter by Difficulty (if file supports it)
        // Check if any question in the (potentially subject-filtered) pool has a difficulty setting
        const hasDifficulty = filteredPool.some(q => !!q.difficulty);
        if (hasDifficulty) {
            filteredPool = filteredPool.filter(q => q.difficulty === config.difficulty);
        }

        if (filteredPool.length === 0) {
            // Fallback messaging
            if (hasCustomSubjects) {
                setError(`No questions found in your file for Subject: ${config.subject.toUpperCase()} and Difficulty: ${config.difficulty}.`);
            } else {
                 setError("No questions loaded.");
            }
            return;
        }

        const shuffled = [...filteredPool].sort(() => 0.5 - Math.random());
        const finalCount = Math.min(config.questionCount, shuffled.length);
        selectedQuestions = shuffled.slice(0, finalCount);

    } else {
      // Standard Loading (Hardwired)
      const rawQuestions = loadQuestionsForTopic(config.subject, config.difficulty);
      if (rawQuestions.length === 0) {
        setError(`No hardwired questions found for ${config.subject} (${config.difficulty}). Please upload questions.`);
        return;
      }
      const shuffled = [...rawQuestions].sort(() => 0.5 - Math.random());
      const finalCount = Math.min(config.questionCount, shuffled.length);
      selectedQuestions = shuffled.slice(0, finalCount);
    }

    if (selectedQuestions.length === 0) {
       setError("No questions available to start the quiz.");
       return;
    }

    setConfig(prev => ({ ...prev, questions: selectedQuestions, questionCount: selectedQuestions.length }));
    
    // Explicitly init audio contexts on user click
    if (musicEnabled && bgMusicRef.current) {
      bgMusicRef.current.currentTime = 0;
      bgMusicRef.current.play().catch(console.warn);
    }

    setView('quiz');
    setQuizState(prev => ({ 
      ...prev, 
      timeRemaining: config.timerSeconds,
      startTime: Date.now(),
      score: 0,
      answers: {},
      currentQuestionIndex: 0,
      lifelinesUsed: { fiftyFifty: false, timeFreeze: false }
    }));
    setHiddenOptions([]);
    setIsTimeFrozen(false);
  };

  // --- Lifeline Handlers ---
  const handleUse5050 = () => {
    if (quizState.lifelinesUsed.fiftyFifty) return;

    const currentQ = config.questions[quizState.currentQuestionIndex];
    const wrongOptions = currentQ.options.filter(o => o !== currentQ.correctAnswer);
    // Shuffle wrong options and take 2 to hide
    const shuffledWrong = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    setHiddenOptions(shuffledWrong);
    setQuizState(prev => ({
        ...prev,
        lifelinesUsed: { ...prev.lifelinesUsed, fiftyFifty: true }
    }));
  };

  const handleUseTimeFreeze = () => {
    if (quizState.lifelinesUsed.timeFreeze || isTimeFrozen) return;
    
    setIsTimeFrozen(true);
    setQuizState(prev => ({
        ...prev,
        lifelinesUsed: { ...prev.lifelinesUsed, timeFreeze: true }
    }));

    // Auto-unfreeze after 10s
    setTimeout(() => {
        setIsTimeFrozen(false);
    }, 10000);
  };


  const handleAnswer = (answer: string) => {
    const currentQ = config.questions[quizState.currentQuestionIndex];
    const isCorrect = answer === currentQ.correctAnswer;

    setQuizState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 1 : prev.score,
      answers: { ...prev.answers, [prev.currentQuestionIndex]: answer }
    }));
  };

  const handleNext = () => {
    setHiddenOptions([]); // Reset hidden options for next Q
    setIsTimeFrozen(false); // Ensure time isn't frozen

    if (quizState.currentQuestionIndex < config.questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        timeRemaining: config.timerSeconds 
      }));
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
      const percentage = Math.round((quizState.score / config.questions.length) * 100);
      const subjectName = SUBJECT_PRESETS.find(s => s.id === config.subject)?.name || config.subject;

      if (currentUser) {
        const result = {
          id: Date.now().toString(),
          userEmail: currentUser.email,
          username: currentUser.username,
          subject: subjectName,
          score: quizState.score,
          totalQuestions: config.questions.length,
          difficulty: config.difficulty,
          date: new Date().toISOString(),
          percentage: percentage,
        };

        const { updatedUser, newBadges } = saveQuizResult(result);
        setCurrentUser(updatedUser);
        setEarnedBadges(newBadges);
      }
      setView('result');
      
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
      }
  };

  // --- Views ---

  const renderWelcome = () => {
    // Filter Categories
    const activePresets = SUBJECT_PRESETS.filter(p => activeSubjectIds.includes(p.id));
    const totalPages = Math.ceil(activePresets.length / ITEMS_PER_PAGE);
    const displayedPresets = activePresets.slice(categoryPage * ITEMS_PER_PAGE, (categoryPage + 1) * ITEMS_PER_PAGE);

    const handleNextPage = () => {
      if (categoryPage < totalPages - 1) setCategoryPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
      if (categoryPage > 0) setCategoryPage(prev => prev - 1);
    };

    return (
      <div className="max-w-7xl mx-auto w-full animate-fade-in pb-20 pt-24 md:pt-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 tracking-tight">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Challenge</span>
          </h1>
          <p className="text-blue-100/80 text-xl max-w-2xl mx-auto font-medium">
            Select a subject, customize your difficulty, and test your knowledge against the clock.
          </p>
        </div>

        {/* Override Banner - ONLY VISIBLE TO ADMIN */}
        {isAdmin && customQuestions && (
          <div className="max-w-3xl mx-auto mb-12 bg-indigo-500/10 border border-indigo-500/50 rounded-2xl p-4 flex items-center justify-between animate-slide-up shadow-xl shadow-indigo-500/10">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-500 rounded-lg text-white">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      {hasCustomSubjects ? 'Master Question Bank Active' : 'Custom Question Set Active'}
                      {hasCustomSubjects && <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">Smart Filter On</span>}
                  </h3>
                  <p className="text-indigo-200 text-sm">
                      File: <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-indigo-100">{customFileName}</span> 
                      <span className="mx-2">•</span> 
                      {customQuestions.length} Questions
                  </p>
                </div>
            </div>
            <div className="text-green-400 flex items-center gap-1 text-sm font-medium">
                  <CheckCircle2 size={16} /> Ready
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Subject Grid with Slider */}
          <div className="lg:col-span-8 relative">
            
            <div className={`grid grid-cols-2 md:grid-cols-3 gap-5 transition-opacity duration-300 min-h-[400px] content-start ${customQuestions && !hasCustomSubjects ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {displayedPresets.map(preset => {
                const Icon = ICON_MAP[preset.icon] || Brain;
                const isSelected = config.subject === preset.id;
                
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSubjectSelect(preset.id)}
                    className={`p-6 rounded-3xl border text-left transition-all duration-300 group relative overflow-hidden flex flex-col justify-between h-44 ${
                      isSelected 
                        ? 'border-blue-400 bg-gradient-to-br from-blue-900/80 to-blue-800/40 shadow-xl shadow-blue-500/10 scale-[1.02]' 
                        : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-600 hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    <div className={`p-3 rounded-2xl w-fit transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 group-hover:text-white group-hover:bg-slate-700'}`}>
                      <Icon size={28} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{preset.name}</h3>
                      <p className={`text-sm mt-2 line-clamp-2 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{preset.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Pagination Controls - Only show if necessary */}
            {totalPages > 1 && (!customQuestions || hasCustomSubjects) && (
              <div className="flex justify-between items-center mt-6 px-2">
                <Button 
                   onClick={handlePrevPage} 
                   disabled={categoryPage === 0}
                   variant="secondary"
                   className="w-12 h-12 !px-0 rounded-full"
                >
                   <ChevronLeft size={24} />
                </Button>
                
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all ${i === categoryPage ? 'bg-blue-500 w-6' : 'bg-slate-700'}`}
                    />
                  ))}
                </div>

                <Button 
                   onClick={handleNextPage} 
                   disabled={categoryPage === totalPages - 1}
                   variant="secondary"
                   className="w-12 h-12 !px-0 rounded-full"
                >
                   <ChevronRight size={24} />
                </Button>
              </div>
            )}

            {/* Helper Text - ONLY VISIBLE TO ADMIN */}
            {isAdmin && customQuestions && !hasCustomSubjects && <p className="text-center text-slate-500 mt-4 text-sm italic">Standard subjects disabled. File overrides all topics.</p>}
            {isAdmin && customQuestions && hasCustomSubjects && <p className="text-center text-indigo-300 mt-4 text-sm font-medium">Select a subject above to filter questions from your Master File.</p>}
          </div>

          {/* Right: Settings & Start */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-28" ref={settingsRef}>
              <SettingsPanel 
                  user={currentUser}
                  count={config.questionCount}
                  setCount={(val) => setConfig(prev => ({...prev, questionCount: val}))}
                  timer={config.timerSeconds}
                  setTimer={(val) => setConfig(prev => ({...prev, timerSeconds: val}))}
                  difficulty={config.difficulty}
                  setDifficulty={(val) => setConfig(prev => ({...prev, difficulty: val}))}
                  musicEnabled={musicEnabled}
                  setMusicEnabled={setMusicEnabled}
                  soundEnabled={soundEnabled}
                  setSoundEnabled={setSoundEnabled}
                  lifelinesEnabled={config.lifelinesEnabled}
                  setLifelinesEnabled={(val) => setConfig(prev => ({...prev, lifelinesEnabled: val}))}
                  onUploadAudio={handleUploadAudio}
                  onRemoveAudio={handleRemoveAudio}
                  customAudioNames={customAudioNames}
                  // New Props
                  isConfigLocked={isConfigLocked}
                  setIsConfigLocked={setIsConfigLocked}
                  customFileName={customFileName}
                  onUploadQuestions={handleUploadQuestions}
                  onRemoveQuestions={handleRemoveQuestions}
                  // Category Management
                  activeSubjectIds={activeSubjectIds}
                  onToggleSubject={handleToggleSubject}
              />

              <div className="mt-8">
                <Button 
                  fullWidth 
                  onClick={handleStartQuiz} 
                  disabled={!config.subject && !customQuestions}
                  className="h-16 text-xl font-bold shadow-blue-500/25"
                >
                  {customQuestions ? 'Start Quiz' : 'Start Challenge'} <ArrowRight className="ml-2" />
                </Button>
                {(!config.subject && !customQuestions) && (
                     <p className="text-center text-slate-500 text-sm mt-3 animate-pulse">Select a category to begin</p>
                )}
              </div>

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl text-sm flex items-start gap-2 animate-pulse">
                  <AlertCircle className="flex-shrink-0" size={18} />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    const question = config.questions[quizState.currentQuestionIndex];
    if (!question) return <div>Loading...</div>;
    
    const hasAnswered = quizState.answers[quizState.currentQuestionIndex] !== undefined;
    
    // Timer Calculations
    // Using a 64x64 SVG coordinate system
    const radius = 28; 
    const circumference = 2 * Math.PI * radius; 
    const offset = circumference - (quizState.timeRemaining / config.timerSeconds) * circumference;

    return (
      <>
      <div className="max-w-4xl mx-auto w-full py-8 space-y-8 pt-32 pb-32 md:pb-8 relative">
        
        {/* Quiz Header - Layout Swapped: Status Left, Quit Right */}
        <div className="flex items-center justify-between px-2">
            
            {/* Left: Timer & Question Counter */}
            <div className="flex items-center gap-6">
                {config.timerSeconds > 0 && (
                    <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 64 64">
                            <circle 
                                cx="32" cy="32" r={radius} 
                                stroke="#1e293b" strokeWidth="6" 
                                fill="transparent" 
                            />
                            <circle 
                                cx="32" cy="32" r={radius} 
                                stroke="currentColor" strokeWidth="6" 
                                fill="transparent" 
                                className={`${isTimeFrozen ? 'text-cyan-400' : (quizState.timeRemaining <= 5 ? 'text-red-500' : 'text-blue-500')} transition-all duration-1000 ease-linear`}
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                transform="rotate(-90 32 32)"
                            />
                             <text
                                x="32"
                                y="32"
                                fill="white"
                                fontSize="22"
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                                dominantBaseline="central"
                                dy="1" 
                            >
                                {isTimeFrozen ? '❄' : quizState.timeRemaining}
                            </text>
                        </svg>
                    </div>
                )}

                <div className="text-left">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Question</div>
                   <div className="flex items-baseline text-3xl font-display font-bold text-white leading-none">
                      <span className="text-blue-400">{quizState.currentQuestionIndex + 1}</span>
                      <span className="text-slate-500 text-2xl mx-2">/</span>
                      <span className="text-slate-400 text-2xl">{config.questions.length}</span>
                   </div>
                </div>
            </div>

            {/* Right: Quit Button */}
            <button onClick={resetQuiz} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors bg-slate-900/50 px-5 py-3 rounded-xl hover:bg-red-500/10 hover:border-red-500/30 border border-slate-800">
                <XCircle size={20} /> <span className="font-bold">Quit</span>
            </button>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
            <div 
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                style={{ width: `${((quizState.currentQuestionIndex + 1) / config.questions.length) * 100}%` }}
            />
        </div>

        {/* Card */}
        <div className="relative">
            <QuizCard 
                question={question}
                selectedAnswer={quizState.answers[quizState.currentQuestionIndex]}
                onSelectAnswer={handleAnswer}
                showFeedback={hasAnswered}
                hiddenOptions={hiddenOptions} 
            />
            
            {/* Lifelines - Positioned inside/over the card area at the bottom for easy access */}
            {config.lifelinesEnabled && !hasAnswered && (
                <div className="absolute -bottom-20 left-0 right-0 flex justify-center gap-4 md:bottom-auto md:top-0 md:right-4 md:left-auto md:flex-col md:justify-start pointer-events-none">
                     {/* Using pointer-events-auto on buttons to allow clicking while container passes through */}
                     
                     {/* We will place them distinctly above options in mobile view via a dedicated div in QuizCard or here if we want them separate. 
                         Actually, let's put them IN BETWEEN the card title and options if possible, or floating at the bottom center of screen.
                         User asked for "most convenient position... quick 5 seconds". 
                         Bottom center above "Next" button is good.
                     */}
                </div>
            )}
            
            {/* RE-POSITIONED LIFELINES: Explicit Row above Options */}
            {config.lifelinesEnabled && !hasAnswered && (
                <div className="flex justify-center gap-6 mt-6 mb-2">
                     <button 
                        onClick={handleUse5050}
                        disabled={quizState.lifelinesUsed.fiftyFifty}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-lg transition-all border-2 ${
                            quizState.lifelinesUsed.fiftyFifty 
                            ? 'bg-slate-800 border-slate-700 text-slate-600 opacity-50 cursor-not-allowed' 
                            : 'bg-indigo-600 border-indigo-400 text-white hover:scale-105 hover:bg-indigo-500 hover:shadow-indigo-500/50'
                        }`}
                     >
                         <Zap size={18} className={quizState.lifelinesUsed.fiftyFifty ? '' : 'fill-yellow-400 text-yellow-400'} />
                         50:50
                     </button>

                     <button 
                        onClick={handleUseTimeFreeze}
                        disabled={quizState.lifelinesUsed.timeFreeze || config.timerSeconds === 0}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-lg transition-all border-2 ${
                            quizState.lifelinesUsed.timeFreeze || config.timerSeconds === 0
                            ? 'bg-slate-800 border-slate-700 text-slate-600 opacity-50 cursor-not-allowed' 
                            : isTimeFrozen 
                                ? 'bg-cyan-500 border-cyan-200 text-white animate-pulse'
                                : 'bg-cyan-700 border-cyan-500 text-white hover:scale-105 hover:bg-cyan-600 hover:shadow-cyan-500/50'
                        }`}
                     >
                         <Snowflake size={18} />
                         {isTimeFrozen ? 'Frozen!' : 'Freeze'}
                     </button>
                </div>
            )}
        </div>

      </div>

      {/* Controls - Fixed at Bottom for Mobile, Static for Desktop */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 bg-[#020617]/90 backdrop-blur-lg border-t border-blue-900/30 md:static md:bg-transparent md:border-0 md:p-0 flex justify-end z-50 md:mt-8 max-w-4xl mx-auto transition-transform duration-300 ${hasAnswered ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
            <Button 
                onClick={handleNext} 
                disabled={!hasAnswered} 
                variant={hasAnswered ? 'primary' : 'secondary'}
                className={`w-full md:w-auto px-10 h-16 text-xl shadow-xl ${hasAnswered ? 'shadow-blue-500/30' : 'md:opacity-0 md:pointer-events-none'}`}
            >
                {quizState.currentQuestionIndex === config.questions.length - 1 ? 'See Results' : 'Next Question'}
                <ArrowRight className="ml-2" size={24} />
            </Button>
      </div>
      </>
    );
  };

  const renderResult = () => {
    const percentage = Math.round((quizState.score / config.questions.length) * 100);
    const subjectName = customQuestions && !hasCustomSubjects ? "Custom Quiz" : (SUBJECT_PRESETS.find(s => s.id === config.subject)?.name || config.subject);

    let message = "Keep trying!";
    if (percentage >= 80) message = "Outstanding!";
    else if (percentage >= 60) message = "Great Job!";
    else if (percentage >= 40) message = "Good Effort!";

    // --- Share Functions ---
    const shareText = `I scored ${percentage}% on the ${subjectName} quiz in QuizzyVibes! Can you beat me?`;
    const shareUrl = window.location.href; // In a real app, this would be a specific result link

    const handleWebShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'QuizzyVibes Result',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                console.log('Share canceled');
            }
        } else {
           // Fallback if native share not supported
           alert("Native sharing not supported on this device. Use the buttons below.");
        }
    };

    const socialLinks = [
        { 
            name: 'Facebook', 
            icon: Facebook, 
            color: 'bg-blue-600', 
            action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank') 
        },
        { 
            name: 'X', 
            icon: Twitter, 
            color: 'bg-black', 
            action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank') 
        },
        { 
            name: 'WhatsApp', 
            icon: MessageCircle, 
            color: 'bg-green-500', 
            action: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank') 
        },
        { 
            name: 'LinkedIn', 
            icon: Linkedin, 
            color: 'bg-blue-700', 
            action: () => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}`, '_blank') 
        },
        { 
            name: 'Email', 
            icon: Mail, 
            color: 'bg-red-500', 
            action: () => window.open(`mailto:?subject=My Quiz Result&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`) 
        },
        { 
            name: 'Copy', 
            icon: LinkIcon, 
            color: 'bg-slate-600', 
            action: () => {
                navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                alert("Result copied to clipboard!");
            } 
        }
    ];

    return (
      <>
      {percentage === 100 && <Confetti />}
      <div className="max-w-2xl mx-auto w-full py-12 animate-slide-up text-center space-y-8 pt-32 relative z-10">
        <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
            <Trophy className={`w-32 h-32 mx-auto ${percentage >= 60 ? 'text-yellow-400' : 'text-slate-500'} relative z-10 drop-shadow-2xl`} />
        </div>
        
        {earnedBadges.length > 0 && (
          <div className="glass-panel p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 inline-block">
            <h3 className="text-yellow-400 font-bold mb-2 flex items-center justify-center gap-2">
              <Sparkles size={20} /> New Badges Unlocked!
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="bg-slate-900/50 px-3 py-2 rounded-lg text-sm text-white flex items-center gap-2">
                  <span>🏆</span> {badge.name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
            <h2 className="text-6xl font-display font-bold text-white tracking-tight">{message}</h2>
            <p className="text-slate-300 text-xl">You completed the <span className="text-blue-400 font-bold">{subjectName}</span> challenge.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Score</div>
                <div className="text-3xl font-bold text-blue-400">{percentage}%</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Difficulty</div>
                <div className="text-xl font-bold text-white pt-1">{config.difficulty}</div>
            </div>
             <div className="glass-panel p-5 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Correct</div>
                <div className="text-3xl font-bold text-green-400">{quizState.score}/{config.questions.length}</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Time</div>
                <div className="text-xl font-bold text-cyan-400 pt-1">
                   {config.timerSeconds === 0 ? 'OFF' : `${config.timerSeconds}s`}
                </div>
            </div>
        </div>
        
        {/* Buttons Row */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full z-20 relative">
            <Button onClick={() => { setView('review'); window.scrollTo(0,0); }} className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 border-0 shadow-lg shadow-indigo-500/30">
                <Eye className="mr-2" size={20} /> Review Answers
            </Button>
            
            <div className="flex gap-4 w-full">
                <Button onClick={resetQuiz} variant="secondary" className="flex-1 h-14">
                    <RefreshCw className="mr-2" size={18} /> Play Again
                </Button>
                <Button onClick={() => setView('leaderboard')} variant="outline" className="flex-1 h-14">
                    <Trophy className="mr-2" size={18} /> Rank
                </Button>
            </div>
        </div>

        {/* --- Share Section --- */}
        <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-900/10 mt-6">
            <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-4 flex items-center justify-center gap-2">
                <Share2 size={14} /> Share Result
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
                {/* Native Share (Mobile) */}
                {navigator.share && (
                    <button 
                        onClick={handleWebShare}
                        className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg"
                        title="Share via..."
                    >
                        <Share2 size={20} />
                    </button>
                )}
                
                {/* Social Buttons */}
                {socialLinks.map((link) => (
                    <button
                        key={link.name}
                        onClick={link.action}
                        className={`p-3 rounded-full ${link.color} text-white hover:opacity-80 transition-opacity shadow-lg`}
                        title={`Share on ${link.name}`}
                    >
                        <link.icon size={20} />
                    </button>
                ))}
            </div>
        </div>
      </div>
      </>
    );
  };

  const renderReview = () => {
    return (
       <div className="max-w-4xl mx-auto w-full py-12 animate-slide-up pt-32 pb-20">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold text-white">Answer Review</h2>
                <Button onClick={() => setView('result')} variant="outline">
                    <XCircle className="mr-2" size={18} /> Close
                </Button>
            </div>

            <div className="space-y-6">
                {config.questions.map((q, idx) => {
                    const userAnswer = quizState.answers[idx];
                    const isCorrect = userAnswer === q.correctAnswer;

                    return (
                        <div key={idx} className={`glass-panel p-6 rounded-2xl border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'} bg-slate-900/40`}>
                             <div className="flex items-start gap-4 mb-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                    {idx + 1}
                                </span>
                                <h3 className="text-lg font-bold text-white">{q.text}</h3>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pl-12">
                                <div className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Your Answer</div>
                                    <div className={`font-medium flex items-center gap-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                        {isCorrect ? <Check size={16} /> : <X size={16} />}
                                        {userAnswer || 'Timed Out / Skipped'}
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/30">
                                    <div className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Correct Answer</div>
                                    <div className="font-medium text-blue-300 flex items-center gap-2">
                                        <CheckCircle2 size={16} />
                                        {q.correctAnswer}
                                    </div>
                                </div>
                             </div>

                             {q.explanation && (
                                 <div className="pl-12 text-sm text-slate-400 italic border-t border-slate-700/50 pt-3 mt-3">
                                     <span className="font-bold text-slate-500 not-italic mr-2">Explanation:</span>
                                     {q.explanation}
                                 </div>
                             )}
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-8 flex justify-center">
                 <Button onClick={() => setView('result')} className="w-48">Back to Results</Button>
            </div>
       </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#020617] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] font-sans selection:bg-blue-500/30 flex items-center justify-center p-4">
        <AuthForm onLogin={setCurrentUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] font-sans selection:bg-blue-500/30">
        <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-blue-950/20 via-transparent to-transparent"></div>
        
        <Navbar 
          user={currentUser} 
          onLogout={handleLogout} 
          currentView={view} 
          onChangeView={(v) => { setError(null); setView(v); }} 
        />
        
        <main className="relative z-10 container mx-auto px-4 py-6 min-h-screen flex flex-col">
            {view === 'welcome' && renderWelcome()}
            {view === 'quiz' && renderQuiz()}
            {view === 'result' && renderResult()}
            {view === 'review' && renderReview()}
            {view === 'profile' && (
                <Profile 
                    user={currentUser} 
                    onUpdateUser={handleUserUpdate} 
                    onViewAdmin={() => setView('admin')}
                />
            )}
            {view === 'leaderboard' && <Leaderboard />}
            {view === 'admin' && <AdminDashboard />}
        </main>
    </div>
  );
}

export default App;
