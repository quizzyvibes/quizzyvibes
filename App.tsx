
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

// Audio Assets - Switched to highly reliable Google Storage URLs (MP3)
// Updated to a softer "Memories" piano track
const DEFAULT_BG_MUSIC = "https://codeskulptor-demos.commondatastorage.googleapis.com/bensound/bensound-memories.mp3"; 
const DEFAULT_TICK_SOUND = "https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3"; 
const DEFAULT_FINISH_SOUND = "https://codeskulptor-demos.commondatastorage.googleapis.com/orders/coins.mp3";

// Increased to 8 to show 2 rows on desktop (4 columns x 2 rows)
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

  // --- AUDIO SYSTEM (Native JS Objects) ---
  const audioSystem = useRef<{
    music: HTMLAudioElement;
    tick: HTMLAudioElement;
    finish: HTMLAudioElement;
  } | null>(null);

  // Track the actual string URLs we have loaded to avoid the browser's .src property normalization issues
  const currentSources = useRef<{ music: string; tick: string; finish: string }>({
    music: '',
    tick: '',
    finish: ''
  });

  // Initialize Audio Objects ONCE
  useEffect(() => {
    if (!audioSystem.current) {
        const music = new Audio(DEFAULT_BG_MUSIC);
        const tick = new Audio(DEFAULT_TICK_SOUND);
        const finish = new Audio(DEFAULT_FINISH_SOUND);

        // Add error listeners to help debug issues
        [music, tick, finish].forEach(a => {
            a.addEventListener('error', (e) => {
                const target = e.target as HTMLAudioElement;
                console.warn(`Audio Error for ${target.src}:`, target.error);
            });
        });

        audioSystem.current = { music, tick, finish };
        
        // Initial Source State
        currentSources.current = {
            music: DEFAULT_BG_MUSIC,
            tick: DEFAULT_TICK_SOUND,
            finish: DEFAULT_FINISH_SOUND
        };

        // Config
        audioSystem.current.music.loop = true;
        audioSystem.current.music.preload = 'auto';
        audioSystem.current.tick.preload = 'auto';
        audioSystem.current.finish.preload = 'auto';
    }

    return () => {
        // Cleanup on unmount
        if (audioSystem.current) {
            audioSystem.current.music.pause();
            audioSystem.current.tick.pause();
            audioSystem.current.finish.pause();
        }
    };
  }, []);

  // Sync sources if custom audio changes
  // FIXED: We now compare against currentSources ref, not the DOM element's src property
  useEffect(() => {
     if (!audioSystem.current) return;
     const sys = audioSystem.current;

     // 1. Music
     const targetMusic = customAudio.music || DEFAULT_BG_MUSIC;
     if (currentSources.current.music !== targetMusic) {
         sys.music.src = targetMusic;
         sys.music.load();
         currentSources.current.music = targetMusic;
         console.log("Music source updated:", targetMusic);
     }

     // 2. Tick
     const targetTick = customAudio.tick || DEFAULT_TICK_SOUND;
     if (currentSources.current.tick !== targetTick) {
         sys.tick.src = targetTick;
         sys.tick.load();
         currentSources.current.tick = targetTick;
     }

     // 3. Finish
     const targetFinish = customAudio.finish || DEFAULT_FINISH_SOUND;
     if (currentSources.current.finish !== targetFinish) {
         sys.finish.src = targetFinish;
         sys.finish.load();
         currentSources.current.finish = targetFinish;
     }

  }, [customAudio]);

  const isAdmin = currentUser?.email && currentUser.email.toLowerCase().trim() === ADMIN_EMAIL;

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

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user: User | null) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

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

  // --- AUDIO LOGIC HANDLERS ---

  // Handle Mute/Unmute logic dynamically
  useEffect(() => {
    const sys = audioSystem.current;
    if (!sys) return;

    if (view === 'quiz') {
       if (musicEnabled) {
          if (sys.music.paused) sys.music.play().catch(() => {});
       } else {
          sys.music.pause();
       }
    } else {
       sys.music.pause();
       sys.music.currentTime = 0;
    }
  }, [musicEnabled, view]);

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
    if (!soundEnabled || !audioSystem.current) return;
    const { tick } = audioSystem.current;
    tick.currentTime = 0;
    tick.play().catch(() => {});
  }, [soundEnabled]);

  const playFinishSound = useCallback(() => {
    if (!soundEnabled || !audioSystem.current) return;
    const { finish } = audioSystem.current;
    finish.currentTime = 0;
    finish.play().catch(() => {});
  }, [soundEnabled]);

  // Test Audio Function (for debugging)
  const handleTestAudio = () => {
      if (!audioSystem.current) return;
      
      const { tick, music } = audioSystem.current;

      // Force load to ensure the element isn't stuck in a completed state
      tick.load();
      
      // Play tick
      tick.currentTime = 0;
      tick.play().then(() => {
          setTimeout(() => {
            // Play a snippet of music
             if (audioSystem.current) {
                 // Always load to ensure we grab the latest source if it changed recently
                 music.load();
                 music.volume = 1;
                 music.play().catch(e => alert("Music failed: " + e));
                 setTimeout(() => audioSystem.current?.music.pause(), 2000);
             }
          }, 500);
      }).catch(e => {
        console.error(e);
        alert(`Audio failed to play. Check device volume. Error: ${e.name} - ${e.message}`);
      });
  };

  // --- QUIZ LOGIC ---

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

  const resetQuiz = () => {
    setView('welcome');
    setConfig((prev: QuizConfig) => ({ ...prev, subject: '', questionCount: 10 })); 
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
    
    // Stop Music on Reset
    if (audioSystem.current) {
        audioSystem.current.music.pause();
        audioSystem.current.music.currentTime = 0;
    }
    
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
      // Play tick sound for last 5 seconds if not frozen
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

    if (audioSystem.current) {
        const { music, tick, finish } = audioSystem.current;

        // Force load ensures that if the src changed recently, it's ready to play.
        // This is safe to call even if already loaded, but it resets playback position.
        if (musicEnabled) music.load();
        if (soundEnabled) {
             tick.load();
             finish.load();
        }

        // 1. Start Music (if enabled)
        if (musicEnabled) {
            music.volume = 1.0; 
            music.currentTime = 0;
            const p = music.play();
            if (p !== undefined) p.catch(e => console.error("Music play blocked", e));
        }

        // 2. Warm up SFX
        if (soundEnabled) {
            tick.muted = true;
            tick.play().then(() => {
                tick.pause();
                tick.currentTime = 0;
                tick.muted = false;
            }).catch(() => {});

            finish.muted = true;
            finish.play().then(() => {
                finish.pause();
                finish.currentTime = 0;
                finish.muted = false;
            }).catch(() => {});
        }
    }

    // 3. Configuration Validation
    if (!config.subject && !customQuestions) {
        setError("Click Go To Top & Choose a Subject");
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

    // 4. State Update
    setConfig((prev: QuizConfig) => ({ ...prev, questions: selectedQuestions, questionCount: selectedQuestions.length }));
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
    setShowExplanation(false);
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
      
      // Stop Music
      if (audioSystem.current) {
         audioSystem.current.music.pause();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderWelcome = () => {
    const filteredPresets = SUBJECT_PRESETS.filter((p: SubjectPreset) => 
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
      <div className="max-w-7xl mx-auto w-full animate-fade-in pb-20 pt-24 px-4">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-2 tracking-tight">
            Choose Your <br className="md:hidden" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Challenge</span>
          </h1>
          
          {isAdmin && (
              <>
                <p className="text-blue-100/80 text-sm md:text-lg max-w-2xl mx-auto font-medium">
                    Select a subject, customize your difficulty, and test your knowledge.
                </p>
                <div className="mt-4 flex justify-center animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-200/60 text-xs font-medium backdrop-blur-sm">
                        <Globe size={14} />
                        <span>Cloud Connected • Progress Saved Online</span>
                    </div>
                </div>
              </>
          )}
        </div>

        {isAdmin && customQuestions && (
          <div className="max-w-3xl mx-auto mb-8 bg-indigo-500/10 border border-indigo-500/50 rounded-2xl p-4 flex items-center justify-between animate-slide-up shadow-xl shadow-indigo-500/10">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-500 rounded-lg text-white">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      {hasCustomSubjects ? 'Master Question Bank Active' : 'Custom Question Set Active'}
                  </h3>
                </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 relative">
            
            {isAdmin && (
                <div className="relative max-w-md mx-auto mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search subjects..." 
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCategoryPage(0); }}
                        className="w-full bg-slate-900/60 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500"
                    />
                </div>
            )}

            <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 transition-opacity duration-300 min-h-[320px] content-start ${customQuestions && !hasCustomSubjects ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {displayedPresets.length > 0 ? displayedPresets.map((preset: SubjectPreset) => {
                const Icon = ICON_MAP[preset.icon] || Brain;
                const isSelected = config.subject === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSubjectSelect(preset.id)}
                    className={`p-4 rounded-3xl border text-center transition-all duration-300 group relative overflow-hidden flex flex-col justify-center items-center h-36 md:h-44 ${
                      isSelected 
                        ? 'border-blue-400 bg-gradient-to-br from-blue-900/80 to-blue-800/40 shadow-xl shadow-blue-500/10 scale-[1.02]' 
                        : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-600 hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    <div className={`mb-3 p-3 rounded-2xl w-fit transition-colors mx-auto ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 group-hover:text-white group-hover:bg-slate-700'}`}>
                      <Icon size={32} className="md:w-10 md:h-10" />
                    </div>
                    <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{preset.name}</h3>
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
              <div className="flex justify-between items-center mt-2 px-2">
                <Button 
                   onClick={handlePrevPage} 
                   disabled={categoryPage === 0}
                   variant="secondary"
                   className="w-10 h-10 !px-0 rounded-full"
                >
                   <ChevronLeft size={20} />
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
                   className="w-10 h-10 !px-0 rounded-full"
                >
                   <ChevronRight size={20} />
                </Button>
              </div>
            )}
            {isAdmin && customQuestions && !hasCustomSubjects && <p className="text-center text-slate-500 mt-4 text-sm italic">Standard subjects disabled. File overrides all topics.</p>}
            {isAdmin && customQuestions && hasCustomSubjects && <p className="text-center text-indigo-300 mt-4 text-sm font-medium">Select a subject above to filter questions from your Master File.</p>}
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

              {/* Added Test Audio Button for Debugging */}
              <div className="flex justify-end mt-2">
                 <button onClick={handleTestAudio} className="text-xs text-blue-400 hover:text-white flex items-center gap-1 underline decoration-dotted">
                     <PlayCircle size={12} /> Test Audio
                 </button>
              </div>

              <div className="mt-6 pb-4">
                <Button 
                  fullWidth 
                  onClick={handleStartQuiz} 
                  disabled={!config.subject && !customQuestions}
                  className="h-16 text-xl font-bold shadow-blue-500/25"
                >
                  {customQuestions ? 'Start Quiz' : 'Start Challenge'} <ArrowRight className="ml-2" />
                </Button>
                
                {error && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl text-sm flex items-center justify-center gap-2 animate-pulse font-bold text-center">
                    <AlertCircle className="flex-shrink-0" size={18} />
                    {error}
                    </div>
                )}

                <button onClick={scrollToTop} className="w-full mt-3 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2">
                    <ArrowUp size={16} /> Go To Top
                </button>

                {(!config.subject && !customQuestions) && (
                     <p className="text-center text-slate-500 text-sm mt-3 animate-pulse">Select a category to begin</p>
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
    if (!question) return <div>Loading...</div>;
    const hasAnswered = quizState.answers[quizState.currentQuestionIndex] !== undefined;
    
    return (
      <div className="fixed inset-0 z-[60] bg-[#020617] flex flex-col h-[100dvh]">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
             <div className="w-10"></div> 
             
             <div className="flex flex-col items-center">
                 {config.timerSeconds > 0 && (
                     <div className={`flex items-center gap-2 font-mono text-3xl font-bold leading-none mb-1 ${isTimeFrozen ? 'text-cyan-400' : quizState.timeRemaining <= 5 ? 'text-red-500' : 'text-blue-400'}`}>
                         {isTimeFrozen ? <Snowflake size={24} /> : null}
                         {quizState.timeRemaining}
                     </div>
                 )}
                 <div className="text-slate-400 font-bold text-lg leading-none">
                     Question {quizState.currentQuestionIndex + 1} <span className="text-slate-600 text-sm">/ {config.questions.length}</span>
                 </div>
             </div>

             <button onClick={resetQuiz} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500/20 transition-all">
                 <XCircle size={24} />
             </button>
        </div>

        <div className="h-1.5 w-full bg-slate-800 flex-shrink-0">
             <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((quizState.currentQuestionIndex + 1) / config.questions.length) * 100}%` }}></div>
        </div>

        <div className="flex-1 overflow-hidden p-4 flex flex-col relative bg-gradient-to-b from-[#020617] to-slate-950">
            {showExplanation ? (
                <div className="flex-1 flex flex-col animate-fade-in h-full overflow-y-auto custom-scrollbar">
                     <div className="flex-shrink-0 mb-6 bg-slate-950/50 border border-slate-700/50 rounded-2xl p-6 min-h-[140px] flex items-center justify-center shadow-inner">
                        <h2 className="text-2xl md:text-3xl font-display font-bold text-white leading-snug text-center opacity-70">
                            {question.text}
                        </h2>
                     </div>

                     <div className="mb-6 text-center animate-slide-up">
                         <div className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">Correct Answer</div>
                         <div className="text-3xl md:text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                             {question.correctAnswer}
                         </div>
                     </div>

                     {question.explanation && (
                        <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl text-center max-w-2xl mx-auto mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
                            <div className="flex items-center justify-center gap-2 mb-3 text-blue-300">
                                <Info size={20} />
                                <span className="font-bold uppercase text-sm">Why is this correct?</span>
                            </div>
                            <p className="text-lg md:text-xl text-blue-100 leading-relaxed">
                                {question.explanation}
                            </p>
                        </div>
                     )}
                     
                     <div className="mt-auto pb-6 flex justify-center animate-slide-up" style={{animationDelay: '0.2s'}}>
                        <Button 
                            onClick={handleNext} 
                            className="h-16 px-12 text-xl font-bold shadow-2xl shadow-blue-500/40 rounded-full"
                        >
                            {quizState.currentQuestionIndex === config.questions.length - 1 ? 'Finish Quiz' : 'Next Question'} <ArrowRight className="ml-2" />
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
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowExplanation(true)} 
                            className="flex-1 h-14 text-lg font-bold border-slate-600 text-blue-200"
                        >
                            <Info className="mr-2" size={20} /> Explain
                        </Button>
                        <Button 
                            onClick={handleNext} 
                            className="flex-1 h-14 text-lg font-bold shadow-lg shadow-blue-500/20"
                        >
                            {quizState.currentQuestionIndex === config.questions.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="ml-2" />
                        </Button>
                    </div>
                ) : (
                    config.lifelinesEnabled && (
                        <div className="flex gap-3 max-w-md mx-auto">
                            <button onClick={handleUse5050} disabled={quizState.lifelinesUsed.fiftyFifty} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all border ${quizState.lifelinesUsed.fiftyFifty ? 'bg-slate-800 border-slate-700 text-slate-600 opacity-50' : 'bg-indigo-600/20 border-indigo-500 text-indigo-300 hover:bg-indigo-600 hover:text-white'}`}>
                                <Zap size={20} className={quizState.lifelinesUsed.fiftyFifty ? '' : 'fill-yellow-400 text-yellow-400'} /> 50:50
                            </button>
                            <button onClick={handleUseTimeFreeze} disabled={quizState.lifelinesUsed.timeFreeze || config.timerSeconds === 0} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all border ${quizState.lifelinesUsed.timeFreeze || config.timerSeconds === 0 ? 'bg-slate-800 border-slate-700 text-slate-600 opacity-50' : isTimeFrozen ? 'bg-cyan-500 border-cyan-200 text-white' : 'bg-cyan-600/20 border-cyan-500 text-cyan-300 hover:bg-cyan-600 hover:text-white'}`}>
                                <Snowflake size={20} /> {isTimeFrozen ? 'Frozen' : 'Freeze'}
                            </button>
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
    const subjectName = customQuestions && !hasCustomSubjects ? "Custom Quiz" : (SUBJECT_PRESETS.find(s => s.id === config.subject)?.name || config.subject);
    let message = percentage >= 80 ? "Outstanding!" : percentage >= 60 ? "Great Job!" : percentage >= 40 ? "Good Effort!" : "Keep trying!";
    
    return (
      <>
      {percentage === 100 && <Confetti />}
      <div className="max-w-2xl mx-auto w-full py-8 animate-slide-up text-center space-y-6 pt-24 relative z-10 px-4">
        
        <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
            <Trophy className={`w-24 h-24 mx-auto ${percentage >= 60 ? 'text-yellow-400' : 'text-slate-500'} relative z-10 drop-shadow-2xl`} />
        </div>

        {earnedBadges.length > 0 && (
          <div className="glass-panel p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 inline-block">
            <h3 className="text-yellow-400 font-bold mb-2 flex items-center justify-center gap-2 text-sm"><Sparkles size={16} /> New Badges Unlocked!</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="bg-slate-900/50 px-3 py-1 rounded-lg text-xs text-white flex items-center gap-2"><span>🏆</span> {badge.name}</div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
            <h2 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight">{message}</h2>
            <p className="text-slate-300 text-lg md:text-xl">You completed the <span className="text-blue-400 font-bold">{subjectName}</span> challenge.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-panel p-4 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Score</div>
                <div className="text-2xl font-bold text-blue-400">{percentage}%</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Difficulty</div>
                <div className="text-lg font-bold text-white pt-1">{config.difficulty}</div>
            </div>
             <div className="glass-panel p-4 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Correct</div>
                <div className="text-2xl font-bold text-green-400">{quizState.score}/{config.questions.length}</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Time</div>
                <div className="text-lg font-bold text-cyan-400 pt-1">{config.timerSeconds === 0 ? 'OFF' : `${config.timerSeconds}s`}</div>
            </div>
        </div>

        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full z-20 relative pt-4">
            <Button onClick={() => { setView('review'); window.scrollTo(0,0); }} className="w-full h-16 text-lg bg-indigo-600 hover:bg-indigo-500 border-0 shadow-lg shadow-indigo-500/30"><Eye className="mr-2" size={24} /> Review Answers</Button>
            
            <div className="flex gap-4 w-full">
                <Button onClick={resetQuiz} variant="secondary" className="flex-1 h-14"><RefreshCw className="mr-2" size={18} /> Play Again</Button>
                <Button onClick={() => setView('leaderboard')} variant="outline" className="flex-1 h-14 bg-slate-800/50 border-slate-600 text-yellow-400 font-bold hover:bg-slate-800 hover:text-yellow-300">
                    <Trophy className="mr-2" size={18} /> Rank
                </Button>
            </div>
        </div>
      </div>
      </>
    );
  };

  const renderReview = () => {
    return (
       <div className="max-w-4xl mx-auto w-full py-12 animate-slide-up pt-32 pb-20 px-4">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white">Answer Review</h2>
                <Button onClick={() => setView('result')} variant="outline"><XCircle className="mr-2" size={18} /> Close</Button>
            </div>
            <div className="space-y-6">
                {config.questions.map((q: Question, idx: number) => {
                    const userAnswer = quizState.answers[idx];
                    const isCorrect = userAnswer === q.correctAnswer;
                    return (
                        <div key={idx} className={`glass-panel p-6 rounded-2xl border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'} bg-slate-900/40`}>
                             <div className="flex items-start gap-4 mb-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">{idx + 1}</span>
                                <h3 className="text-base md:text-lg font-bold text-white">{q.text}</h3>
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





















