import React, { useState } from 'react';
import { getLeaderboardData } from '../services/storageService';
import { Trophy, Medal, Star } from 'lucide-react';
import { format } from 'date-fns';

const Leaderboard: React.FC = () => {
  const { rankedUsers, topScores } = getLeaderboardData();
  const [activeTab, setActiveTab] = useState<'users' | 'scores'>('users');

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-slide-up pt-40 pb-20">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tight drop-shadow-2xl">
          Leaderboard
        </h1>
        <p className="text-slate-300 text-xl font-medium">See who's topping the charts</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="glass-panel p-1 rounded-xl flex">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Top Players
          </button>
          <button
            onClick={() => setActiveTab('scores')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'scores' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Recent High Scores
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border-slate-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-6 font-semibold w-24 text-center">Rank</th>
                <th className="p-6 font-semibold">{activeTab === 'users' ? 'Player' : 'Details'}</th>
                <th className="p-6 font-semibold text-right">{activeTab === 'users' ? 'Total XP' : 'Score'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {activeTab === 'users' ? (
                rankedUsers.map((user, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-6 text-center">
                       {idx === 0 && <Trophy className="mx-auto text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" size={32} />}
                       {idx === 1 && <Medal className="mx-auto text-slate-300" size={28} />}
                       {idx === 2 && <Medal className="mx-auto text-amber-600" size={28} />}
                       {idx > 2 && <span className="text-slate-500 font-bold text-lg">#{idx + 1}</span>}
                    </td>
                    <td className="p-6">
                      <div className="font-bold text-white text-xl group-hover:text-blue-300 transition-colors">{user.username}</div>
                      <div className="text-sm text-slate-500">{user.quizzesPlayed} quizzes played</div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="font-bold text-indigo-400 text-2xl">{user.totalScore}</div>
                    </td>
                  </tr>
                ))
              ) : (
                topScores.map((score, idx) => (
                   <tr key={score.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-6 text-center">
                       <span className="text-slate-500 font-bold text-lg">#{idx + 1}</span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">{score.username}</span>
                         <span className="text-slate-500 text-sm">• {score.subject}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {score.difficulty} • {format(new Date(score.date), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="font-bold text-green-400 text-2xl">{score.percentage}%</div>
                      <div className="text-xs text-slate-500">{score.score}/{score.totalQuestions}</div>
                    </td>
                  </tr>
                ))
              )}

              {(activeTab === 'users' ? rankedUsers : topScores).length === 0 && (
                <tr>
                   <td colSpan={3} className="p-12 text-center text-slate-500">
                      No data available yet. Start playing!
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;