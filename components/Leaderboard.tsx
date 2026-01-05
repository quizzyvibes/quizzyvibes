
import React, { useState, useEffect } from 'react';
import { getCloudLeaderboardData } from '../services/firebase';
import { QuizResult } from '../types';
import { Trophy, Medal } from 'lucide-react';
import { format } from 'date-fns';

const Leaderboard: React.FC = () => {
  const [topScores, setTopScores] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLB = async () => {
        try {
            const data = await getCloudLeaderboardData();
            setTopScores(data.topScores);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchLB();
  }, []);

  if (loading) return <div className="p-20 text-center text-slate-400">Loading Leaderboard...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-slide-up pt-40 pb-20">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-display font-bold text-white tracking-tight drop-shadow-2xl px-2">
          Leaderboard
        </h1>
        <p className="text-slate-300 text-lg md:text-xl font-medium">Top scores from around the world</p>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border-slate-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 md:p-6 font-semibold w-16 md:w-24 text-center">Rank</th>
                <th className="p-4 md:p-6 font-semibold">Details</th>
                <th className="p-4 md:p-6 font-semibold text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {topScores.map((score, idx) => (
                   <tr key={score.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 md:p-6 text-center">
                       {idx === 0 && <Trophy className="mx-auto text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] w-6 h-6 md:w-8 md:h-8" />}
                       {idx === 1 && <Medal className="mx-auto text-slate-300 w-6 h-6 md:w-[28px] md:h-[28px]" />}
                       {idx === 2 && <Medal className="mx-auto text-amber-600 w-6 h-6 md:w-[28px] md:h-[28px]" />}
                       {idx > 2 && <span className="text-slate-500 font-bold text-base md:text-lg">#{idx + 1}</span>}
                    </td>
                    <td className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                         <span className="font-bold text-white text-base md:text-lg group-hover:text-blue-300 transition-colors">{score.username}</span>
                         <span className="hidden md:inline text-slate-500">•</span>
                         <span className="text-slate-400 text-xs md:text-sm">{score.subject}</span>
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-500 mt-1">
                        {score.difficulty} • {format(new Date(score.date), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="p-4 md:p-6 text-right">
                      <div className="font-bold text-green-400 text-lg md:text-2xl">{score.percentage}%</div>
                      <div className="text-[10px] md:text-xs text-slate-500">{score.score}/{score.totalQuestions}</div>
                    </td>
                  </tr>
                ))}

              {topScores.length === 0 && (
                <tr>
                   <td colSpan={3} className="p-12 text-center text-slate-500">
                      No global scores yet. Be the first!
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



