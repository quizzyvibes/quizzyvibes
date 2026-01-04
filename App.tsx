import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain, ArrowRight, RefreshCw, Trophy, XCircle, Sparkles,
  Globe, FlaskConical, Utensils, Calculator, Cpu, AlertCircle, FileSpreadsheet, CheckCircle2,
  Cat, Rocket, HeartPulse, Music, Scroll, HelpCircle, Sprout, ChefHat, ChevronLeft, ChevronRight,
  Share2, Link as LinkIcon, Facebook, Twitter, Linkedin, Mail, MessageCircle,
  Zap, Snowflake, Eye, Check, X, Search, HardDrive, ArrowUp, Info, PlayCircle
} from 'lucide-react';

import Button from './components/Button';
import QuizCard from './components/QuizCard';
import SettingsPanel from './components/SettingsPanel';
import AuthForm from './components/AuthForm';
import Navbar from './components/Navbar';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard';

import { subscribeToAuth, logout, saveResultToCloud, subscribeToGlobalConfig, saveGlobalQuizConfig, GlobalConfig } from './services/firebase';
import { loadQuestionsForTopic } from './services/questionLoader';
import { parseQuestionFile } from './services/fileService';
import { SUBJECT_PRESETS, DEFAULT_QUESTION_COUNT, DEFAULT_TIMER_SECONDS, DEFAULT_DIFFICULTY, ADMIN_EMAIL } from './constants';
import { QuizConfig, QuizState, User, Badge, Question, Difficulty, SubjectPreset } from './types';

const ICON_MAP: Record<string, React.ElementType> = {
  Brain, Globe, FlaskConical, Utensils, Calculator, Cpu,
  Cat, Rocket, HeartPulse, Music, Scroll, HelpCircle, Sprout, ChefHat
};

const CATEGORY_STORAGE_KEY = 'quizmaster_active_categories';

// Audio Assets
const DEFAULT_BG_MUSIC = "https://codeskulptor-demos.commondatastorage.googleapis.com/bensound/bensound-memories.mp3";
const DEFAULT_TICK_SOUND = "https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3";
const DEFAULT_FINISH_SOUND = "https://codeskulptor-demos.commondatastorage.googleapis.com/orders/coins.mp3";

const ITEMS_PER_PAGE = 8;

const Confetti = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
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
      <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } } .animate-confetti { animation-name: confetti; animation-timing-function: ease-out; animation-iteration-count: 1; }`}</style>
    </div>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [view, setView] = useState<'welcome' | 'quiz' | 'result' | 'profile' | 'leaderboard' | 'review' | 'admin'>('welcome');
  const [error, setError] = useState<string | null>(null);

  const [activeSubjectIds, setActiveSubjectIds] = useState<string[]>([]);
  const [categoryPage, setCategoryPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const settingsRef = useRef<HTMLDivElement>(null);

  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

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

  const [isConfigLocked, setIsConfigLocked] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Question[] | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [hasCustomSubjects, setHasCustomSubjects] = useState(false);

  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [isTimeFrozen, setIsTimeFrozen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // --- HTML Audio Refs ---
  const musicRef = useRef<HTMLAudioElement>(null);
  const tickRef = useRef<HTMLAudioElement>(null);
  const finishRef = useRef<HTMLAudioElement>(null);

  const isAdmin = currentUser?.email && currentUser.email.toLowerCase().trim() === ADMIN_EMAIL;

  // Global Config Sub
  useEffect(() => {
    const unsubscribe = subscribeToGlobalConfig((config: GlobalConfig | null) => {
      if (config) {
        setCustomQuestions(config.questions);
        setCustomFileName(config.fileName);
        setHasCustomSubjects(config.questions.some((q: Question) => !!q.subject));
        if (config.activeSubjectIds && config.activeSubjectIds.length > 0) {
          setActiveSubjectIds(config.activeSubjectIds);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Auth Sub
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user: User | null) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // LocalStorage for Categories
  useEffect(() => {
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

  // --- AUDIO LOGIC ---

  // Control Music PAUSING based on View & Setting
  // Note: PLAYING is handled by the click handler for mobile compatibility
  useEffect(() => {
    if (!musicRef.current) return;

    if (view !== 'quiz' || !musicEnabled) {
      musicRef.current.pause();
      if (view !== 'quiz') {
        musicRef.current.currentTime = 0;
      }
    }
  }, [view, musicEnabled]);

  const handleUploadAudio = (type: 'music' | 'tick' | 'finish', file: File) => {
    const url = URL.createObjectURL(file);
    setCustomAudio(prev => ({ ...prev, [type]: url }));
    setCustomAudioNames(prev => ({ ...prev, [type]: file.name }));

    if (type === 'music') {
      setMusicEnabled(true);
    } else {
      setSoundEnabled(true);
    }
  };

  const handleRemoveAudio = (type: 'music' | 'tick' | 'finish') => {
    if (customAudio[type]) {
      URL.revokeObjectURL(customAudio[type]!);
    }
    setCustomAudio(prev => ({ ...prev, [type]: null }));
    setCustomAudioNames(prev => ({ ...prev, [type]: undefined }));
  };

  const playTick = useCallback(() => {
    if (!soundEnabled || !tickRef.current) return;
    tickRef.current.currentTime = 0;
    tickRef.current.play().catch(() => {});
  }, [soundEnabled]);

  const playFinishSound = useCallback(() => {
    if (!soundEnabled || !finishRef.current) return;
    finishRef.current.currentTime = 0;
    finishRef.current.play().catch(() => {});
  }, [soundEnabled]);

  const handleTestAudio = () => {
    if (musicRef.current) {
      musicRef.current.currentTime = 0;
      musicRef.current.load();
      musicRef.current.play().catch(e => alert("Play error: " + e));
      setTimeout(() => musicRef.current?.pause(), 2000);
    }
  };

  // --- QUIZ LOGIC ---

  const [config, setConfig] = useState<QuizConfig>({
    subject: '',
    difficulty: DEFAULT_DIFFICULTY,
    questionCount: DEFAULT_QUESTION_COUNT,
    timerSeconds: DEFAULT_TIMER_SECONDS,
    questions: [],
    lifelinesEnabled: false
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

  const handleUploadQuestions = async (file: File) => {
    try {
      const questions = await parseQuestionFile(file);
      setCustomQuestions(questions);
      setCustomFileName(file.name);

      const hasSubjects = questions.some((q: Question) => !!q.subject);
      setHasCustomSubjects(hasSubjects);

      if (!hasSubjects) {
        setConfig((prev: QuizConfig) => ({ ...prev, questionCount: Math.min(questions.length, 50) }));
      }

      if (isAdmin) {
        await saveGlobalQuizConfig(questions, file.name, activeSubjectIds);
        alert("Quiz synced to all users successfully!");
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
    setConfig((prev: QuizConfig) => ({ ...prev, questionCount: DEFAULT_QUESTION_COUNT }));
  };

  const resetQuiz = () => {
    setView('welcome');
    setConfig((prev: QuizConfig) => ({ ...prev, subject: '', questions: [] }));
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
    setShowExplanation(false);
    setError(null);
    setEarnedBadges([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      resetQuiz();
    } catch (e) {
      console.error("Logout failed locally", e);
      setCurrentUser(null);
    }
  };

  const handleSubjectSelect = (subjectId: string) => {
    setConfig((prev: QuizConfig) => ({ ...prev, subject: subjectId }));
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
          if (prev.answers[prev.currentQuestionIndex]) return prev;
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

  // --- CORE FIX FOR MOBILE AUDIO ---
  const handleStartQuiz = () => {
    // 1. IMMEDIATE AUDIO TRIGGER (Synchronous with click)
    if (musicRef.current && musicEnabled) {
      musicRef.current.volume = 0.5;
      musicRef.current.currentTime = 0;
      // .load() is vital on mobile if the source changed
      musicRef.current.load(); 
      musicRef.current.play().catch(e => console.error("Music blocked on mobile:", e));
    }

    // Warm up SFX (Mobile requires audio to be "unlocked" via play)
    if (soundEnabled) {
      if(tickRef.current) { tickRef.current.load(); tickRef.current.play().then(() => tickRef.current?.pause()).catch(()=>{}); }
      if(finishRef.current) { finishRef.current.load(); finishRef.current.play().then(() => finishRef.current?.pause()).catch(()=>{}); }
    }

    // 2. Validate and build logic
    if (!config.subject && !customQuestions) {
      setError("Choose a Subject first");
      return;
    }

    let selectedQuestions: Question[] = [];

    if (customQuestions && customQuestions.length > 0) {
      let filteredPool = customQuestions;
      if (hasCustomSubjects) {
        filteredPool = filteredPool.filter((q: Question) => q.subject === config.subject);
      }
      const hasDifficulty = filteredPool.some((q: Question) => !!q.difficulty);
      if (hasDifficulty) {
        filteredPool = filteredPool.filter((q: Question) => q.difficulty === config.difficulty);
      }

      if (filteredPool.length === 0) {
        setError(`No questions found for selection.`);
        return;
      }

      const shuffled = [...filteredPool].sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, Math.min(config.questionCount, shuffled.length));
    } else {
      const rawQuestions = loadQuestionsForTopic(config.subject, config.difficulty);
      if (rawQuestions.length === 0) {
        setError(`No questions found for ${config.subject}.`);
        return;
      }
      const shuffled = [...rawQuestions].sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, Math.min(config.questionCount, shuffled.length));
    }

    // 3. Update State
    setConfig((prev: QuizConfig) => ({ ...prev, questions: selectedQuestions, questionCount: selectedQuestions.length }));
    setQuizState({ 
      currentQuestionIndex: 0,
      score: 0,
      answers: {},
      isFinished: false,
      timeRemaining: config.timerSeconds,
      startTime: Date.now(),
      lifelinesUsed: { fiftyFifty: false, timeFreeze: false }
    });
    setHiddenOptions([]);
    setIsTimeFrozen(false);
    setShowExplanation(false);
    setView('quiz');
    setError(null);
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
    setTimeout(() => setIsTimeFrozen(false), 10000);
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
    setShowExplanation(false);
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
      const { updatedUser, newBadges } = await saveResultToCloud(result);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        setEarnedBadges(newBadges);
      }
    }
    setView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const renderWelcome = () => {
    const filteredPresets = SUBJECT_PRESETS.filter((p: SubjectPreset) =>
      activeSubjectIds.includes(p.id) &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredPresets.length / ITEMS_PER_PAGE);
    const displayedPresets = filteredPresets.slice(categoryPage * ITEMS_PER_PAGE, (categoryPage + 1) * ITEMS_PER_PAGE);

    return (
      <div className="max-w-7xl mx-auto w-full animate-fade-in pb-20 pt-24 px-4">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-2 tracking-tight">
            Choose Your <br className="md:hidden" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Challenge</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 relative">
            <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 min-h-[320px] content-start ${customQuestions && !hasCustomSubjects ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {displayedPresets.map((preset: SubjectPreset) => {
                const Icon = ICON_MAP[preset.icon] || Brain;
                const isSelected = config.subject === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSubjectSelect(preset.id)}
                    className={`p-4 rounded-3xl border text-center transition-all duration-300 group flex flex-col justify-center items-center h-36 md:h-44 ${
                      isSelected 
                        ? 'border-blue-400 bg-gradient-to-br from-blue-900/80 to-blue-800/40' 
                        : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`mb-3 p-3 rounded-2xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      <Icon size={32} className="md:w-10 md:h-10" />
                    </div>
                    <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>{preset.name}</h3>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div ref={settingsRef}>
              <SettingsPanel 
                user={currentUser}
                count={config.questionCount}
                setCount={(val: number) => setConfig((prev: QuizConfig) => ({...prev, questionCount: val}))}
                timer={config.timerSeconds}
                setTimer={(val: number) => setConfig((prev: QuizConfig) => ({...prev, timerSeconds: val}))}
                difficulty={config.difficulty}
                setDifficulty={(val: Difficulty) => setConfig((prev: QuizConfig) => ({...prev, difficulty: val}))}
                musicEnabled={musicEnabled}
                setMusicEnabled={setMusicEnabled}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                lifelinesEnabled={config.lifelinesEnabled}
                setLifelinesEnabled={(val: boolean) => setConfig((prev: QuizConfig) => ({...prev, lifelinesEnabled: val}))}
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
              <div className="mt-6">
                <Button fullWidth onClick={handleStartQuiz} className="h-16 text-xl font-bold">
                  Start Quiz <ArrowRight className="ml-2" />
                </Button>
                {error && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl text-sm flex items-center justify-center gap-2">
                    <AlertCircle size={18} /> {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    const question = config.questions[quizState.currentQuestionIndex];
    if (!question) return <div className="text-white p-20 text-center">Loading Questions...</div>;
    const hasAnswered = quizState.answers[quizState.currentQuestionIndex] !== undefined;

    return (
      <div className="fixed inset-0 z-[60] bg-[#020617] flex flex-col h-[100dvh]">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
             <div className="w-10"></div> 
             <div className="flex flex-col items-center">
                 {config.timerSeconds > 0 && (
                     <div className={`flex items-center gap-2 font-mono text-3xl font-bold ${isTimeFrozen ? 'text-cyan-400' : quizState.timeRemaining <= 5 ? 'text-red-500' : 'text-blue-400'}`}>
                         {quizState.timeRemaining}
                     </div>
                 )}
                 <div className="text-slate-400 font-bold">Question {quizState.currentQuestionIndex + 1} / {config.questions.length}</div>
             </div>
             <button onClick={resetQuiz} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full text-slate-400"><XCircle size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-gradient-to-b from-[#020617] to-slate-950">
            {showExplanation ? (
                <div className="flex-1 flex flex-col animate-fade-in">
                    <div className="bg-slate-950/50 p-6 rounded-2xl mb-6 text-center text-white text-2xl font-bold">{question.text}</div>
                    <div className="text-center mb-6">
                        <div className="text-green-400 text-sm font-bold uppercase mb-2 tracking-widest">Correct Answer</div>
                        <div className="text-4xl font-bold text-white">{question.correctAnswer}</div>
                    </div>
                    {question.explanation && (
                        <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl text-center text-blue-100 text-lg">
                            {question.explanation}
                        </div>
                    )}
                    <div className="mt-auto pb-6 flex justify-center">
                        <Button onClick={handleNext} className="h-16 px-12 text-xl font-bold rounded-full">
                            {quizState.currentQuestionIndex === config.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                        </Button>
                    </div>
                </div>
            ) : (
                <QuizCard 
                    question={question}
                    selectedAnswer={quizState.answers[quizState.currentQuestionIndex]}
                    onSelectAnswer={handleAnswer}
                    showFeedback={hasAnswered}
                    hiddenOptions={hiddenOptions} 
                />
            )}
        </div>

        {!showExplanation && (
            <div className="flex-shrink-0 p-4 bg-slate-900/80 border-t border-slate-800 backdrop-blur-lg">
                {hasAnswered ? (
                    <div className="flex gap-3 max-w-md mx-auto">
                        <Button variant="secondary" onClick={() => setShowExplanation(true)} className="flex-1 h-14 font-bold">Explain</Button>
                        <Button onClick={handleNext} className="flex-1 h-14 font-bold">{quizState.currentQuestionIndex === config.questions.length - 1 ? 'Finish' : 'Next'}</Button>
                    </div>
                ) : (
                    config.lifelinesEnabled && (
                        <div className="flex gap-3 max-w-md mx-auto">
                            <button onClick={handleUse5050} disabled={quizState.lifelinesUsed.fiftyFifty} className="flex-1 py-4 rounded-xl border border-indigo-500 text-indigo-300 font-bold">50:50</button>
                            <button onClick={handleUseTimeFreeze} disabled={quizState.lifelinesUsed.timeFreeze} className="flex-1 py-4 rounded-xl border border-cyan-500 text-cyan-300 font-bold">Freeze</button>
                        </div>
                    )
                )}
            </div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    const percentage = Math.round((quizState.score / config.questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto text-center pt-24 px-4 space-y-8">
        {percentage === 100 && <Confetti />}
        <Trophy className="w-24 h-24 mx-auto text-yellow-400" />
        <h2 className="text-5xl font-bold text-white">Score: {percentage}%</h2>
        <div className="flex gap-4 justify-center">
            <Button onClick={resetQuiz} variant="secondary">Play Again</Button>
            <Button onClick={() => setView('leaderboard')}>Leaderboard</Button>
        </div>
      </div>
    );
  };

  if (loadingAuth) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div></div>;
  if (!currentUser) return <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4"><AuthForm onLogin={setCurrentUser} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] font-sans selection:bg-blue-500/30">
        {/* AUDIO ELEMENTS - Must remain in DOM at all times */}
        <audio 
            ref={musicRef} 
            src={customAudio.music || DEFAULT_BG_MUSIC} 
            loop 
            preload="auto" 
            playsInline
        />
        <audio 
            ref={tickRef} 
            src={customAudio.tick || DEFAULT_TICK_SOUND} 
            preload="auto" 
            playsInline
        />
        <audio 
            ref={finishRef} 
            src={customAudio.finish || DEFAULT_FINISH_SOUND} 
            preload="auto" 
            playsInline
        />

        {view !== 'quiz' && (
            <Navbar 
              user={currentUser} 
              onLogout={handleLogout} 
              currentView={view} 
              onChangeView={(v: any) => { setError(null); setView(v); }} 
            />
        )}
        
        <main className={`relative z-10 container mx-auto flex flex-col ${view === 'quiz' ? '' : 'min-h-screen'}`}>
            {view === 'welcome' && renderWelcome()}
            {view === 'quiz' && renderQuiz()}
            {view === 'result' && renderResult()}
            {view === 'profile' && <Profile user={currentUser} onUpdateUser={handleUserUpdate} onViewAdmin={() => setView('admin')} />}
            {view === 'leaderboard' && <Leaderboard />}
            {view === 'admin' && <AdminDashboard />}
        </main>
    </div>
  );
}

export default App;





























