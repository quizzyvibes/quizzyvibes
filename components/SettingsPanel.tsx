
import React from 'react';
import { Difficulty, User } from '../types';
import { Settings, Clock, BarChart3, ListOrdered, Music, Volume2, Upload, Lock, ShieldAlert, Check, CloudLightning, Zap } from 'lucide-react';
import { ADMIN_EMAIL } from '../constants';

interface SettingsPanelProps {
  user: User | null;
  count: number;
  setCount: (val: number) => void;
  timer: number;
  setTimer: (val: number) => void;
  difficulty: Difficulty;
  setDifficulty: (val: Difficulty) => void;
  musicEnabled: boolean;
  setMusicEnabled: (val: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  lifelinesEnabled: boolean;
  setLifelinesEnabled: (val: boolean) => void;
  onUploadAudio: (type: 'music' | 'tick' | 'finish', file: File) => void;
  onRemoveAudio: (type: 'music' | 'tick' | 'finish') => void;
  customAudioNames: { music?: string; tick?: string; finish?: string };
  // New Props
  isConfigLocked: boolean;
  setIsConfigLocked: (val: boolean) => void;
  customFileName: string | null;
  onUploadQuestions: (file: File) => void;
  onRemoveQuestions: () => void;
  activeSubjectIds?: string[];
  onToggleSubject?: (id: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  user,
  count, setCount, timer, setTimer, difficulty, setDifficulty,
  musicEnabled, setMusicEnabled, soundEnabled, setSoundEnabled,
  lifelinesEnabled, setLifelinesEnabled,
  onUploadAudio, onRemoveAudio, customAudioNames,
  isConfigLocked,
  // Unused props in this view but kept for interface compatibility if needed elsewhere
  setIsConfigLocked, customFileName, onUploadQuestions, onRemoveQuestions,
  activeSubjectIds, onToggleSubject
}) => {

  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  const handleFileChange = (type: 'music' | 'tick' | 'finish') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadAudio(type, e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-6 bg-slate-900/60 border border-slate-800 relative">
      
      {!isAdmin && isConfigLocked && (
        <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center text-center p-6 border border-slate-800/50">
           <Lock size={48} className="text-slate-500 mb-4" />
           <h3 className="text-2xl font-bold text-white mb-2">Settings Locked</h3>
           <p className="text-slate-400 text-base">The quiz configuration has been set by the host.</p>
        </div>
      )}

      {/* Bigger Header */}
      <h3 className="text-3xl font-display font-bold text-white flex items-center gap-3 pb-3 border-b border-slate-800/50">
        <Settings className="text-blue-400" size={32} />
        Game Config
      </h3>
      
      <div className={!isAdmin && isConfigLocked ? 'opacity-30 pointer-events-none filter grayscale' : ''}>
        
        {/* Difficulty - BIGGER BUTTONS */}
        <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-bold text-slate-200 mb-3">
                <BarChart3 size={20} className="text-blue-400" /> Difficulty Level
            </label>
            <div className="flex gap-3 p-1">
            {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((level) => {
                const isActive = difficulty === level;
                let activeClass = '';
                if (level === Difficulty.EASY) activeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
                else if (level === Difficulty.MEDIUM) activeClass = 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
                else activeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]';

                return (
                    <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 py-5 px-3 rounded-2xl text-lg md:text-xl font-bold transition-all duration-300 border-2 shadow-sm ${
                        isActive 
                        ? activeClass
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    >
                    {level}
                    </button>
                )
            })}
            </div>
        </div>

        {/* Question Count */}
        <div className="mb-6">
            <label className="flex items-center gap-3 text-lg font-bold text-slate-200 mb-4">
            <span className="flex items-center gap-2">
                <ListOrdered size={20} className="text-blue-400"/> 
                Question Count
            </span>
            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-md font-mono text-sm border border-blue-500/30">
                {count}
            </span>
            </label>
            <div className="flex items-center gap-4 px-1">
                <span className="font-mono text-sm font-bold text-slate-500">5</span>
                <input 
                type="range" 
                min="5" 
                max="50" 
                step="5"
                value={count} 
                onChange={(e) => setCount(Number(e.target.value))}
                className="flex-1 h-3 bg-slate-950 border border-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
                <span className="font-mono text-sm font-bold text-slate-500">50</span>
            </div>
        </div>

        {/* Timer */}
        <div className="mb-6">
            <label className="flex justify-between items-center text-lg font-bold text-slate-200 mb-3">
            <span className="flex items-center gap-2"><Clock size={20} className="text-blue-400" /> Timer (sec)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[0, 5, 10, 15, 30, 60].map(t => (
                    <button
                        key={t}
                        onClick={() => setTimer(t)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors border ${
                            timer === t 
                            ? 'bg-cyan-700 text-white border-cyan-600 shadow-lg shadow-cyan-500/20' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                    >
                        {t === 0 ? 'OFF' : `${t}s`}
                    </button>
                ))}
            </div>
        </div>

        {/* Lifelines Toggle */}
        <div className="mb-6">
           <label className="text-lg font-bold text-slate-200 flex items-center gap-2 mb-3">
               <Zap size={20} className="text-blue-400" /> Power-ups
           </label>
           <button 
                onClick={() => setLifelinesEnabled(!lifelinesEnabled)}
                className={`w-full p-4 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    lifelinesEnabled 
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
                >
                <div className="flex items-center gap-3">
                    <CloudLightning size={24} />
                    <div className="text-left">
                        <span className="text-sm font-bold block">50/50 & Freeze</span>
                        <span className="text-xs opacity-70">Help options during quiz</span>
                    </div>
                </div>
                <div className={`text-[10px] uppercase px-2 py-1 rounded font-bold ${lifelinesEnabled ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {lifelinesEnabled ? 'ACTIVE' : 'OFF'}
                </div>
            </button>
        </div>

        {/* Audio Controls */}
        <div className="space-y-4 pt-4 border-t border-slate-800/50">
            <label className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Volume2 size={20} className="text-blue-400" /> Audio Settings
            </label>

            <div className="grid grid-cols-2 gap-3">
                {/* Toggles */}
                <button 
                onClick={() => setMusicEnabled(!musicEnabled)}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    musicEnabled 
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
                >
                <Music size={24} />
                <span className="text-sm font-bold flex items-center gap-1">
                    Music 
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${musicEnabled ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {musicEnabled ? 'ON' : 'OFF'}
                    </span>
                </span>
                </button>

                <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    soundEnabled 
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
                >
                <Volume2 size={24} />
                <span className="text-sm font-bold flex items-center gap-1">
                    SFX 
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${soundEnabled ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {soundEnabled ? 'ON' : 'OFF'}
                    </span>
                </span>
                </button>
            </div>
            
            {/* ADMIN ONLY: Restore Audio Uploads */}
            {isAdmin && (
                <div className="space-y-2 mt-4 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2 flex items-center gap-1"><Upload size={10} /> Custom Audio (Admin)</p>
                    
                    <div className="grid grid-cols-3 gap-2">
                        <label className="flex flex-col items-center justify-center p-2 border border-slate-700 border-dashed rounded-lg hover:bg-slate-800 cursor-pointer text-center">
                            <span className="text-[10px] text-slate-400 font-bold">Music</span>
                             {customAudioNames.music ? <Check size={12} className="text-green-500"/> : <Upload size={12} className="text-slate-500"/>}
                            <input type="file" accept="audio/*" onChange={handleFileChange('music')} className="hidden" />
                        </label>
                        <label className="flex flex-col items-center justify-center p-2 border border-slate-700 border-dashed rounded-lg hover:bg-slate-800 cursor-pointer text-center">
                            <span className="text-[10px] text-slate-400 font-bold">Tick</span>
                            {customAudioNames.tick ? <Check size={12} className="text-green-500"/> : <Upload size={12} className="text-slate-500"/>}
                            <input type="file" accept="audio/*" onChange={handleFileChange('tick')} className="hidden" />
                        </label>
                        <label className="flex flex-col items-center justify-center p-2 border border-slate-700 border-dashed rounded-lg hover:bg-slate-800 cursor-pointer text-center">
                            <span className="text-[10px] text-slate-400 font-bold">Finish</span>
                             {customAudioNames.finish ? <Check size={12} className="text-green-500"/> : <Upload size={12} className="text-slate-500"/>}
                            <input type="file" accept="audio/*" onChange={handleFileChange('finish')} className="hidden" />
                        </label>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;





