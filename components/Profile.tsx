
import React, { useRef, useState, useEffect } from 'react';
import { User } from '../types';
import { getUserResults, updateUserProfile } from '../services/storageService';
import { BADGES } from '../constants';
import * as Icons from 'lucide-react';
import { format } from 'date-fns';
import Button from './Button';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onViewAdmin?: () => void;
}

const ADMIN_EMAIL = 'admin@quizzyvibes.com';

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onViewAdmin }) => {
  const [currentUser, setCurrentUser] = useState<User>(user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sync local state if parent user prop changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const results = getUserResults(currentUser.email);
  const totalQuizzes = results.length;
  const totalScore = results.reduce((acc, r) => acc + r.score, 0);
  const totalQuestions = results.reduce((acc, r) => acc + r.totalQuestions, 0);
  const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  
  // Calculate best subject
  const subjectScores: Record<string, number> = {};
  results.forEach(r => {
    subjectScores[r.subject] = (subjectScores[r.subject] || 0) + r.score;
  });
  const bestSubject = Object.entries(subjectScores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const joinedDate = currentUser.joinedAt ? format(new Date(currentUser.joinedAt), 'PPP') : 'Unknown';
  
  const isAdmin = currentUser.email?.toLowerCase().trim() === ADMIN_EMAIL;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        try {
          const updated = { ...currentUser, avatar: base64String };
          // 1. Save to Storage
          updateUserProfile(updated);
          // 2. Update Local State
          setCurrentUser(updated);
          // 3. Update Parent State (App -> Navbar)
          onUpdateUser(updated); 
        } catch (err) {
          console.error("Failed to save avatar", err);
          alert("Image too large to save locally. Please try a smaller image.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-slide-up pt-40 pb-20">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8 relative">
        
        {/* Redundant Admin Button (in case they miss the Navbar one) */}
        {isAdmin && onViewAdmin && (
            <div className="absolute top-4 right-4">
                 <Button onClick={onViewAdmin} variant="secondary" className="text-xs py-2 h-auto gap-2 bg-slate-800/80 border-slate-600">
                    <Icons.ShieldAlert size={14} className="text-red-400" />
                    Admin
                 </Button>
            </div>
        )}

        <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
           {currentUser.avatar ? (
              <img 
                src={currentUser.avatar} 
                alt="Avatar" 
                className="w-32 h-32 rounded-full object-cover shadow-2xl border-4 border-indigo-500/30 group-hover:border-indigo-400 transition-colors" 
              />
           ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-4 border-indigo-500/30 group-hover:border-indigo-400 transition-all">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
           )}
           
           {/* Camera Icon - FIXED Position & Visibility */}
           {/* 'absolute -bottom-1 -right-1' places it at the corner.
               We add a dark border matching the background to make it look like a cutout/overlay. */}
           <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-2.5 border-[4px] border-[#0f172a] text-white shadow-lg hover:bg-blue-500 transition-colors z-20">
              <Icons.Camera size={18} />
           </div>
           
           <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileChange} 
             accept="image/*" 
             className="hidden" 
           />
        </div>

        <div className="text-center md:text-left space-y-3 flex-1">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">{currentUser.username}</h1>
            <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2">
                <Icons.Calendar size={14} /> Member since {joinedDate}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
             {currentUser.badges.map(badgeId => {
               const badge = BADGES.find(b => b.id === badgeId);
               if (!badge) return null;
               return (
                 <span key={badgeId} className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs rounded-full font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                    <Icons.Award size={12} className="text-yellow-400" /> {badge.name}
                 </span>
               );
             })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-2xl text-center hover:bg-slate-800/50 transition-colors">
           <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Quizzes</div>
           <div className="text-3xl font-bold text-white">{totalQuizzes}</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl text-center hover:bg-slate-800/50 transition-colors">
           <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Questions</div>
           <div className="text-3xl font-bold text-indigo-400">{totalQuestions}</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl text-center hover:bg-slate-800/50 transition-colors">
           <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Avg. Score</div>
           <div className="text-3xl font-bold text-green-400">{averageScore}%</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl text-center hover:bg-slate-800/50 transition-colors">
           <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Best Subject</div>
           <div className="text-xl font-bold text-purple-400 truncate pt-1">{bestSubject}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Icons.Medal className="text-yellow-500" /> Achievements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {BADGES.map(badge => {
             const isUnlocked = currentUser.badges.includes(badge.id);
             // Dynamic icon lookup
             // @ts-ignore
             const Icon = Icons[badge.icon] || Icons.Award;

             return (
               <div key={badge.id} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                 isUnlocked 
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-indigo-500/30' 
                  : 'bg-slate-900/30 border-slate-800 opacity-50 grayscale'
               }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUnlocked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-600'
                  }`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{badge.name}</h3>
                    <p className="text-sm text-slate-400">{badge.description}</p>
                  </div>
                  {isUnlocked && <Icons.CheckCircle className="ml-auto text-green-500" size={20} />}
               </div>
             )
           })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
         <h2 className="text-xl font-bold text-white">Recent Activity</h2>
         <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 text-sm">
                    <th className="p-4 font-semibold">Quiz</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">No quizzes taken yet.</td>
                    </tr>
                  ) : (
                    [...results].reverse().slice(0, 10).map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                           <div className="font-medium text-white">{r.subject}</div>
                           <div className="text-xs text-slate-500">{r.difficulty} • {r.totalQuestions} Questions</div>
                        </td>
                        <td className="p-4 text-slate-400 text-sm">{format(new Date(r.date), 'PPP p')}</td>
                        <td className="p-4">
                          <span className={`font-bold ${r.percentage >= 80 ? 'text-green-400' : r.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {r.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Profile;
