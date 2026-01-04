
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Brain, ArrowRight, RefreshCw, Trophy, XCircle, Sparkles,
  Globe, FlaskConical, Utensils, Calculator, Cpu, AlertCircle, FileSpreadsheet, CheckCircle2,
  Cat, Rocket, HeartPulse, Music, Scroll, HelpCircle, Sprout, ChefHat, ChevronLeft, ChevronRight,
  Share2, Link as LinkIcon, Facebook, Twitter, Linkedin, Mail, MessageCircle,
  Zap, Snowflake, Eye, Check, X, Search, HardDrive
} from 'lucide-react';

import Button from './components/Button';
import QuizCard from './components/QuizCard';
import SettingsPanel from './components/SettingsPanel';
import AuthForm from './components/AuthForm';
import Navbar from './components/Navbar';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard';

// Switch to Firebase Imports
import { subscribeToAuth, logout, saveResultToCloud } from './services/firebase';
import { loadQuestionsForTopic } from './services/questionLoader';
import { parseQuestionFile } from './services/fileService';
import { SUBJECT_PRESETS, DEFAULT_QUESTION_COUNT, DEFAULT_TIMER_SECONDS, DEFAULT_DIFFICULTY, ADMIN_EMAIL } from './constants';
import { QuizConfig, QuizState, User, Badge, Question, Difficulty } from './types';

const ICON_MAP: Record<string, React.ElementType> = {
  Brain, Globe, FlaskConical, Utensils, Calculator, Cpu,
  Cat, Rocket, HeartPulse, Music, Scroll, HelpCircle, Sprout, ChefHat
};

const CATEGORY_STORAGE_KEY = 'quizmaster_active_categories';
const DEFAULT_BG_MUSIC = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=cyberpunk-2099-10586.mp3"; 

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
  const [loadingAuth, setLoadingAuth] = useState(true); // New Loading State
  const [view, setView] = useState<'welcome' | 'quiz' | 'result' | 'profile' | 'leaderboard' | 'review' | 'admin'>('welcome');
  const [error, setError] = useState<string | null>(null);
  
  // Category State
  const [activeSubjectIds, setActiveSubjectIds] = useState<string[]>([]);
  const [categoryPage, setCategoryPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 6;

  // Refs
  const settingsRef = useRef<HTMLDivElement>(null);

  // Audio State
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

  // Admin Control States
  const [isConfigLocked, setIsConfigLocked] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Question[] | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [hasCustomSubjects, setHasCustomSubjects] = useState(false);

  // Lifeline State
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [isTimeFrozen, setIsTimeFrozen] = useState(false);

  // Audio Refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const customTickRef = useRef<HTMLAudioElement | null>(null);
  const customFinishRef = useRef<HTMLAudioElement | null>(null);

  const isAdmin = currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  // --- FIREBASE AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Initialize Active Categories
    const storedCats = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (storedCats) {
      setActiveSubjectIds(JSON.parse(storedCats));
    } else {
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

  const handleRemoveAudio = (type: 'music' | 'tick' | 'finish') => {
    if (customAudio[type]) {
        URL.revokeObjectURL(customAudio[type]!);
    }
    setCustomAudio(prev => ({ ...prev, [type]: null }));
    setCustomAudioNames(prev => ({ ...prev, [type]: undefined }));

    if (type === 'tick') customTickRef.current = null;
    else if (type === 'finish') customFinishRef.current = null;
    else if (type === 'music' && bgMusicRef.current) {
        bgMusicRef.current.src = DEFAULT_BG_MUSIC;
        if (musicEnabled && view === 'quiz') {
            bgMusicRef.current.play().catch(console.warn);
        }
    }
  };

  const handleUploadQuestions = async (file: File) => {
    try {
      const questions = await parseQuestionFile(file);
      setCustomQuestions(questions);
      setCustomFileName(file.name);
      
      const hasSubjects = questions.some(q => !!q.subject);
      setHasCustomSubjects(hasSubjects);

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

  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    if (customAudio.tick && customTickRef.current) {
        customTickRef.current.currentTime = 0;
        customTickRef.current.play().catch(e => console.warn("Tick play error", e));
    }
  }, [soundEnabled, customAudio.tick]);

  const playFinishSound = useCallback(() => {
    if (!soundEnabled) return;
    if (customAudio.finish && customFinishRef.current) {
        customFinishRef.current.currentTime = 0;
        customFinishRef.current.play().catch(console.warn);
    }
  }, [soundEnabled, customAudio.finish]);

  const [config, setConfig] = useState<QuizConfig>({
    subject: '', 
    difficulty: DEFAULT_DIFFICULTY,
    questionCount: DEFAULT_QUESTION_COUNT,
    timerSeconds: DEFAULT_TIMER_SECONDS,
    questions: [],
    lifelinesEnabled: true 
  });

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
    
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
  };

  const handleLogout = async () => {
    await logout();
    // Auth listener will handle setting currentUser to null
    resetQuiz();
  };

  const handleSubjectSelect = (subjectId: string) => {
    setConfig(prev => ({ ...prev, subject: subjectId }));
    setError(null);
    setTimeout(() => {
      if (settingsRef.current) {
        const yOffset = -100; 
        const element = settingsRef.current;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
      }
    }, 100);
  };

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

  useEffect(() => {
    if (view === 'quiz' && config.timerSeconds > 0) {
      if (quizState.timeRemaining <= 5 && quizState.timeRemaining > 0 && !isTimeFrozen) {
         playTick();
      }
      if (quizState.timeRemaining === 0) {
          playFinishSound();
      }
    }
  }, [quizState.timeRemaining, view, config.timerSeconds, playTick, playFinishSound, isTimeFrozen]);

  useEffect(() => {
     if (view !== 'quiz' || config.timerSeconds === 0) return;
     const interval = setInterval(() => {
        if (!isTimeFrozen) {
            setQuizState(prev => {
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

  useEffect(() => {
    const isAnswered = quizState.answers[quizState.currentQuestionIndex] !== undefined;
    if (config.timerSeconds > 0 && quizState.timeRemaining === 0 && !isAnswered && view === 'quiz') {
       handleAnswer('TIMEOUT');
    }
  }, [quizState.timeRemaining, quizState.answers, quizState.currentQuestionIndex, view, config.timerSeconds]);

  const handleStartQuiz = () => {
    setError(null);

    if (!config.subject && !customQuestions) {
        setError("Please select a quiz category to start!");
        return;
    }

    let selectedQuestions: Question[] = [];

    if (customQuestions && customQuestions.length > 0) {
        let filteredPool = customQuestions;
        if (hasCustomSubjects) {
            filteredPool = filteredPool.filter(q => q.subject === config.subject);
        }
        const hasDifficulty = filteredPool.some(q => !!q.difficulty);
        if (hasDifficulty) {
            filteredPool = filteredPool.filter(q => q.difficulty === config.difficulty);
        }

        if (filteredPool.length === 0) {
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

  const handleUse5050 = () => {
    if (quizState.lifelinesUsed.fiftyFifty) return;
    const currentQ = config.questions[quizState.currentQuestionIndex];
    const wrongOptions = currentQ.options.filter(o => o !== currentQ.correctAnswer);
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
    setHiddenOptions([]);
    setIsTimeFrozen(false);
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

  const finishQuiz = async () => {
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

        // SAVE TO CLOUD
        const { updatedUser, newBadges } = await saveResultToCloud(result);
        
        if (updatedUser) {
            setCurrentUser(updatedUser);
            setEarnedBadges(newBadges);
        }
      }
      setView('result');
      
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
      }
  };

  // --- Views ---

  // NOTE: renderWelcome, renderQuiz, renderResult, renderReview are identical to previous version, 
  // just ensuring they use the new state and handlers. 
  // Copying logic for brevity in this snippet.
  
  const renderWelcome = () => {
    // Filter Categories
    const filteredPresets = SUBJECT_PRESETS.filter(p => 
      activeSubjectIds.includes(p.id) && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredPresets.length / ITEMS_PER_PAGE);
    const displayedPresets = filteredPresets.slice(categoryPage * ITEMS_PER_PAGE, (categoryPage + 1) * ITEMS_PER_PAGE);

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
            Select a subject, customize your difficulty, and test your knowledge.
          </p>
           <div className="mt-6 flex justify-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-200/60 text-xs font-medium backdrop-blur-sm">
                <Globe size={14} />
                <span>Cloud Connected • Progress Saved Online</span>
            </div>
          </div>
        </div>

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
          <div className="lg:col-span-8 relative">
            <div className="relative max-w-md mx-auto mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search subjects..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCategoryPage(0); }}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500"
                />
            </div>

            <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 transition-opacity duration-300 min-h-[400px] content-start ${customQuestions && !hasCustomSubjects ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {displayedPresets.length > 0 ? displayedPresets.map(preset => {
                const Icon = ICON_MAP[preset.icon] || Brain;
                const isSelected = config.subject === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSubjectSelect(preset.id)}
                    className={`p-3 md:p-6 rounded-3xl border text-left transition-all duration-300 group relative overflow-hidden flex flex-col justify-between min-h-[160px] h-auto md:h-44 ${
                      isSelected 
                        ? 'border-blue-400 bg-gradient-to-br from-blue-900/80 to-blue-800/40 shadow-xl shadow-blue-500/10 scale-[1.02]' 
                        : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-600 hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    <div className={`p-2 md:p-3 rounded-2xl w-fit transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 group-hover:text-white group-hover:bg-slate-700'}`}>
                      <Icon size={24} className="md:w-7 md:h-7" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-base md:text-lg break-words ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{preset.name}</h3>
                      <p className={`text-xs md:text-sm mt-1 md:mt-2 line-clamp-2 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{preset.description}</p>
                    </div>
                  </button>
                )
              }) : (
                 <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-10">
                    <Search size={48} className="mb-4 opacity-50" />
                    <p>No subjects found for "{searchTerm}"</p>
                    <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-400 hover:underline">Clear Search</button>
                 </div>
              )}
            </div>

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
            {isAdmin && customQuestions && !hasCustomSubjects && <p className="text-center text-slate-500 mt-4 text-sm italic">Standard subjects disabled. File overrides all topics.</p>}
            {isAdmin && customQuestions && hasCustomSubjects && <p className="text-center text-indigo-300 mt-4 text-sm font-medium">Select a subject above to filter questions from your Master File.</p>}
          </div>

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
                  isConfigLocked={isConfigLocked}
                  setIsConfigLocked={setIsConfigLocked}
                  customFileName={customFileName}
                  onUploadQuestions={handleUploadQuestions}
                  onRemoveQuestions={handleRemoveQuestions}
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
    const radius = 28; 
    const circumference = 2 * Math.PI * radius; 
    const offset = circumference - (quizState.timeRemaining / config.timerSeconds) * circumference;

    return (
      <>
      <div className="max-w-4xl mx-auto w-full py-8 space-y-8 pt-32 pb-32 md:pb-8 relative">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-6">
                {config.timerSeconds > 0 && (
                    <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r={radius} stroke="#1e293b" strokeWidth="6" fill="transparent" />
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className={`${isTimeFrozen ? 'text-cyan-400' : (quizState.timeRemaining <= 5 ? 'text-red-500' : 'text-blue-500')} transition-all duration-1000 ease-linear`} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 32 32)" />
                             <text x="32" y="32" fill="white" fontSize="22" fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="central" dy="1">
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
            <button onClick={resetQuiz} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors bg-slate-900/50 px-5 py-3 rounded-xl hover:bg-red-500/10 hover:border-red-500/30 border border-slate-800">
                <XCircle size={20} /> <span className="font-bold">Quit</span>
            </button>
        </div>
        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
            <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ width: `${((quizState.currentQuestionIndex + 1) / config.questions.length) * 100}%` }} />
        </div>
        <div className="relative">
            <QuizCard 
                question={question}
                selectedAnswer={quizState.answers[quizState.currentQuestionIndex]}
                onSelectAnswer={handleAnswer}
                showFeedback={hasAnswered}
                hiddenOptions={hiddenOptions} 
            />
            {config.lifelinesEnabled && !hasAnswered && (
                <div className="flex justify-center gap-6 mt-6 mb-2">
                     <button onClick={handleUse5050} disabled={quizState.lifelinesUsed.fiftyFifty} className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-lg transition-all border-2 ${quizState.lifelinesUsed.fiftyFifty ? 'bg-slate-800 border-slate-700 text-slate-600 opacity-50 cursor-not-allowed' : 'bg-indigo-600 border-indigo-400 text-white hover:scale-105 hover:bg-indigo-500 hover:shadow-indigo-500/50'}`}>
                         <Zap size={18} className={quizState.lifelinesUsed.fiftyFifty ? '' : 'fill-yellow-400 text-yellow-400'} /> 50:50
                     </button>
                     <button onClick={handleUseTimeFreeze} disabled={quizState.lifelinesUsed.timeFreeze || config.timerSeconds === 0} className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-lg transition-all border-2 ${quizState.lifelinesUsed.timeFreeze || config.timerSeconds === 0 ? 'bg-slate-800 border-slate-700 text-slate-600 opacity-50 cursor-not-allowed' : isTimeFrozen ? 'bg-cyan-500 border-cyan-200 text-white animate-pulse' : 'bg-cyan-700 border-cyan-500 text-white hover:scale-105 hover:bg-cyan-600 hover:shadow-cyan-500/50'}`}>
                         <Snowflake size={18} /> {isTimeFrozen ? 'Frozen!' : 'Freeze'}
                     </button>
                </div>
            )}
        </div>
      </div>
      <div className={`fixed bottom-0 left-0 right-0 p-4 bg-[#020617]/90 backdrop-blur-lg border-t border-blue-900/30 md:static md:bg-transparent md:border-0 md:p-0 flex justify-end z-50 md:mt-8 max-w-4xl mx-auto transition-transform duration-300 ${hasAnswered ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
            <Button onClick={handleNext} disabled={!hasAnswered} variant={hasAnswered ? 'primary' : 'secondary'} className={`w-full md:w-auto px-10 h-16 text-xl shadow-xl ${hasAnswered ? 'shadow-blue-500/30' : 'md:opacity-0 md:pointer-events-none'}`}>
                {quizState.currentQuestionIndex === config.questions.length - 1 ? 'See Results' : 'Next Question'} <ArrowRight className="ml-2" size={24} />
            </Button>
      </div>
      </>
    );
  };

  const renderResult = () => {
    const percentage = Math.round((quizState.score / config.questions.length) * 100);
    const subjectName = customQuestions && !hasCustomSubjects ? "Custom Quiz" : (SUBJECT_PRESETS.find(s => s.id === config.subject)?.name || config.subject);
    let message = percentage >= 80 ? "Outstanding!" : percentage >= 60 ? "Great Job!" : percentage >= 40 ? "Good Effort!" : "Keep trying!";
    const shareText = `I scored ${percentage}% on the ${subjectName} quiz in QuizzyVibes! Can you beat me?`;
    const shareUrl = window.location.href; 
    
    // Reuse share functions from previous snippet...
    const socialLinks = [
        { name: 'Copy', icon: LinkIcon, color: 'bg-slate-600', action: () => { navigator.clipboard.writeText(`${shareText} ${shareUrl}`); alert("Result copied!"); } }
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
            <h3 className="text-yellow-400 font-bold mb-2 flex items-center justify-center gap-2"><Sparkles size={20} /> New Badges Unlocked!</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="bg-slate-900/50 px-3 py-2 rounded-lg text-sm text-white flex items-center gap-2"><span>🏆</span> {badge.name}</div>
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
                <div className="text-xl font-bold text-cyan-400 pt-1">{config.timerSeconds === 0 ? 'OFF' : `${config.timerSeconds}s`}</div>
            </div>
        </div>
        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full z-20 relative">
            <Button onClick={() => { setView('review'); window.scrollTo(0,0); }} className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 border-0 shadow-lg shadow-indigo-500/30"><Eye className="mr-2" size={20} /> Review Answers</Button>
            <div className="flex gap-4 w-full">
                <Button onClick={resetQuiz} variant="secondary" className="flex-1 h-14"><RefreshCw className="mr-2" size={18} /> Play Again</Button>
                <Button onClick={() => setView('leaderboard')} variant="outline" className="flex-1 h-14"><Trophy className="mr-2" size={18} /> Rank</Button>
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
                <Button onClick={() => setView('result')} variant="outline"><XCircle className="mr-2" size={18} /> Close</Button>
            </div>
            <div className="space-y-6">
                {config.questions.map((q, idx) => {
                    const userAnswer = quizState.answers[idx];
                    const isCorrect = userAnswer === q.correctAnswer;
                    return (
                        <div key={idx} className={`glass-panel p-6 rounded-2xl border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'} bg-slate-900/40`}>
                             <div className="flex items-start gap-4 mb-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">{idx + 1}</span>
                                <h3 className="text-lg font-bold text-white">{q.text}</h3>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pl-12">
                                <div className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Your Answer</div>
                                    <div className={`font-medium flex items-center gap-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>{isCorrect ? <Check size={16} /> : <X size={16} />}{userAnswer || 'Timed Out / Skipped'}</div>
                                </div>
                                <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/30">
                                    <div className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Correct Answer</div>
                                    <div className="font-medium text-blue-300 flex items-center gap-2"><CheckCircle2 size={16} />{q.correctAnswer}</div>
                                </div>
                             </div>
                             {q.explanation && (
                                 <div className="pl-12 text-sm text-slate-400 italic border-t border-slate-700/50 pt-3 mt-3"><span className="font-bold text-slate-500 not-italic mr-2">Explanation:</span>{q.explanation}</div>
                             )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 flex justify-center"><Button onClick={() => setView('result')} className="w-48">Back to Results</Button></div>
       </div>
    );
  };

  // --- Main Render ---

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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


