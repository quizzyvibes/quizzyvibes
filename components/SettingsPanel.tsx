
import React from 'react';
import { Difficulty, User } from '../types';
import { Settings, Clock, BarChart3, ListOrdered, Music, Volume2, Upload, Lock, ShieldAlert, Trash2, Unlock, FileSpreadsheet, List, Zap } from 'lucide-react';
import { SUBJECT_PRESETS } from '../constants';

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

const ADMIN_EMAIL = 'admin@quizzyvibes.com';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  user,
  count, setCount, timer, setTimer, difficulty, setDifficulty,
  musicEnabled, setMusicEnabled, soundEnabled, setSoundEnabled,
  lifelinesEnabled, setLifelinesEnabled,
  onUploadAudio, onRemoveAudio, customAudioNames,
  isConfigLocked, setIsConfigLocked, customFileName, onUploadQuestions, onRemoveQuestions,
  activeSubjectIds, onToggleSubject
}) => {

  // FIX: Safely check for admin status using optional chaining on the property access
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  const handleFileChange = (type: 'music' | 'tick' | 'finish') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadAudio(type, e.target.files[0]);
    }
  };

  const handleQuestionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        onUploadQuestions(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-8 bg-slate-900/60 border border-slate-800 relative">
      
      {/* Locked Overlay for Non-Admins */}
      {!isAdmin && isConfigLocked && (
        <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center text-center p-6 border border-slate-800/50">
           <Lock size={48} className="text-slate-500 mb-4" />
           <h3 className="text-xl font-bold text-white mb-2">Settings Locked</h3>
           <p className="text-slate-400 text-sm">The quiz configuration has been set by the host.</p>
        </div>
      )}

      <h3 className="text-xl font-bold text-white flex items-center gap-3 pb-2 border-b border-slate-800/50">
        <Settings className="text-blue-400" size={24} />
        Game Settings
      </h3>
      
      {/* WRAPPER: Opacity/Disable for locked state visual (under overlay) */}
      <div className={!isAdmin && isConfigLocked ? 'opacity-30 pointer-events-none filter grayscale' : ''}>
        
        {/* Difficulty */}
        <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-3">
                <BarChart3 size={18} className="text-blue-400" /> Difficulty Level
            </label>
            <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
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
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                        isActive 
                        ? activeClass
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    >
                    {level}
                    </button>
                )
            })}
            </div>
        </div>

        {/* Question Count */}
        <div className="mb-8">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-200 mb-4">
            <span className="flex items-center gap-2">
                <ListOrdered size={18} className="text-blue-400"/> 
                Question Count
            </span>
            <span className="bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-md font-mono text-xs border border-blue-500/30">
                {count}
            </span>
            </label>
            <div className="flex items-center gap-4 px-1">
                <span className="font-mono text-xs font-bold text-slate-500">5</span>
                <input 
                type="range" 
                min="5" 
                max="50" 
                step="5"
                value={count} 
                onChange={(e) => setCount(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-950 border border-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
                <span className="font-mono text-xs font-bold text-slate-500">50</span>
            </div>
        </div>

        {/* Timer */}
        <div className="mb-8">
            <label className="flex justify-between items-center text-sm font-bold text-slate-200 mb-3">
            <span className="flex items-center gap-2"><Clock size={18} className="text-blue-400" /> Timer (sec)</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${timer === 0 ? 'text-slate-500' : 'text-cyan-300 bg-cyan-900/30'}`}>
                {timer === 0 ? 'OFF' : 'ON'}
            </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
                {[0, 5, 10, 15].map(t => (
                    <button
                        key={t}
                        onClick={() => setTimer(t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${
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
        <div className="mb-8 p-3 rounded-xl border border-slate-700 bg-slate-900/40 flex items-center justify-between">
           <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg">
                   <Zap size={18} />
               </div>
               <div>
                   <div className="text-sm font-bold text-white">Power-ups</div>
                   <div className="text-[10px] text-slate-400">Enable 50/50 & Freeze</div>
               </div>
           </div>
           <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={lifelinesEnabled} onChange={(e) => setLifelinesEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
           </label>
        </div>

        {/* Audio Controls */}
        <div className="space-y-4 pt-2 border-t border-slate-800/50">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Volume2 size={18} className="text-blue-400" /> Audio Settings
            </label>

            <div className="grid grid-cols-2 gap-3">
                {/* Toggles */}
                <button 
                onClick={() => setMusicEnabled(!musicEnabled)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    musicEnabled 
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
                >
                <Music size={18} />
                <span className="text-xs font-bold flex items-center gap-1">
                    Music 
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${musicEnabled ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {musicEnabled ? 'ON' : 'OFF'}
                    </span>
                </span>
                </button>

                <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    soundEnabled 
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
                >
                <Volume2 size={18} />
                <span className="text-xs font-bold flex items-center gap-1">
                    SFX 
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${soundEnabled ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {soundEnabled ? 'ON' : 'OFF'}
                    </span>
                </span>
                </button>
            </div>
        </div>
      </div>

        {/* ADMIN ZONE - Only visible to Owner */}
        {isAdmin && (
            <div className="mt-8 pt-6 border-t border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent p-4 -mx-2 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-2 right-2 text-red-500/10 group-hover:text-red-500/20 transition-colors">
                    <ShieldAlert size={64} />
                </div>
                <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Lock size={12} /> Admin Control Center
                </h4>
                
                <div className="space-y-4 relative z-10 mt-4">

                     {/* Manage Categories */}
                     <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-3">
                           <List size={14} className="text-yellow-400" /> Manage Categories
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                           {SUBJECT_PRESETS.map(subject => {
                              const isActive = activeSubjectIds?.includes(subject.id);
                              return (
                                 <button 
                                    key={subject.id}
                                    onClick={() => onToggleSubject && onToggleSubject(subject.id)}
                                    className={`px-2 py-1.5 rounded text-[10px] font-bold text-left truncate transition-colors border ${
                                       isActive 
                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' 
                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                                    }`}
                                 >
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-blue-500' : 'bg-slate-600'}`}></span>
                                    {subject.name}
                                 </button>
                              )
                           })}
                        </div>
                     </div>
                    
                    {/* Game Lock Toggle */}
                    <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${isConfigLocked ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                {isConfigLocked ? <Lock size={16} /> : <Unlock size={16} />}
                             </div>
                             <div>
                                <div className="text-xs font-bold text-slate-200">Lock Config</div>
                                <div className="text-[10px] text-slate-400">Prevent players changing settings</div>
                             </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isConfigLocked} onChange={(e) => setIsConfigLocked(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>

                    {/* Question Bank Upload */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                <FileSpreadsheet size={14} className="text-green-400"/> Question Bank (Excel)
                            </span>
                        </div>
                        
                        {customFileName ? (
                            <div className="space-y-2">
                                <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-xs text-green-300">
                                    <FileSpreadsheet size={16} />
                                    <span className="truncate flex-1">{customFileName}</span>
                                </div>
                                <button onClick={onRemoveQuestions} className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                    <Trash2 size={14} /> Clear Bank & Reset
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[10px] text-slate-400 mb-2">Upload .xlsx file to override all questions.</p>
                                <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg cursor-pointer transition-colors text-xs text-slate-300 font-bold">
                                    <Upload size={14} /> Upload Excel
                                    <input type="file" accept=".xlsx, .xls" onChange={handleQuestionFileChange} className="hidden" />
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-700/50 my-2"></div>

                    {/* Asset Control (Existing) */}
                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Audio Assets</p>
                        {/* Music */}
                        <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                             <div className="flex items-center gap-2 overflow-hidden">
                                <Music size={14} className="text-blue-400 flex-shrink-0" />
                                <span className="text-xs text-slate-400 truncate">{customAudioNames.music || 'Default'}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <label className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer text-slate-300">
                                    <Upload size={12} />
                                    <input type="file" accept="audio/*" onChange={handleFileChange('music')} className="hidden" />
                                </label>
                                {customAudioNames.music && (
                                    <button onClick={() => onRemoveAudio('music')} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                             </div>
                        </div>
                        {/* Tick */}
                        <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                             <div className="flex items-center gap-2 overflow-hidden">
                                <Volume2 size={14} className="text-blue-400 flex-shrink-0" />
                                <span className="text-xs text-slate-400 truncate">{customAudioNames.tick ? 'Custom Tick' : 'Default Tick'}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <label className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer text-slate-300">
                                    <Upload size={12} />
                                    <input type="file" accept="audio/*" onChange={handleFileChange('tick')} className="hidden" />
                                </label>
                                {customAudioNames.tick && (
                                    <button onClick={() => onRemoveAudio('tick')} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                             </div>
                        </div>
                         {/* Finish */}
                         <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                             <div className="flex items-center gap-2 overflow-hidden">
                                <Volume2 size={14} className="text-blue-400 flex-shrink-0" />
                                <span className="text-xs text-slate-400 truncate">{customAudioNames.finish ? 'Custom Finish' : 'Default Finish'}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <label className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer text-slate-300">
                                    <Upload size={12} />
                                    <input type="file" accept="audio/*" onChange={handleFileChange('finish')} className="hidden" />
                                </label>
                                {customAudioNames.finish && (
                                    <button onClick={() => onRemoveAudio('finish')} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default SettingsPanel;
