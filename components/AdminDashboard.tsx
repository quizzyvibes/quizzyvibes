
import React, { useMemo, useState, useEffect } from 'react';
import { getAllUsersFromCloud, getAllResultsFromCloud, saveGlobalQuizConfig } from '../services/firebase';
import { parseQuestionFile } from '../services/fileService';
import { format } from 'date-fns';
import { User, QuizResult } from '../types';
import { ShieldAlert, Globe, Activity, TrendingUp, BarChart2, Mail, FileSpreadsheet, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from './Button';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, resultsData] = await Promise.all([
          getAllUsersFromCloud(),
          getAllResultsFromCloud()
        ]);
        setUsers(usersData);
        setAllResults(resultsData);
      } catch (error) {
        console.error("Failed to fetch admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      setUploadStatus(null);
      
      try {
          const questions = await parseQuestionFile(file);
          // Auto-enable all subjects if present, or just leave as is? 
          // For global sync, usually we might want to default active ids based on the file content, 
          // but for simplicity we'll just save the questions.
          const activeSubjectIds = ['geo','sci','nut','tech','math','gen','pets','astro','anat','music','hist','riddle','garden','cook']; // Enable all by default for simplicity when uploading new master file
          
          await saveGlobalQuizConfig(questions, file.name, activeSubjectIds);
          setUploadStatus({ message: `Successfully synced ${questions.length} questions from ${file.name}`, type: 'success' });
      } catch (err: any) {
          setUploadStatus({ message: err.message || "Upload Failed", type: 'error' });
      } finally {
          setIsUploading(false);
      }
  };

  const processedUsers = useMemo(() => {
    return users.map(user => {
      const userResults = allResults.filter(r => r.userEmail === user.email);
      const totalQuizzes = userResults.length;
      const totalScore = userResults.reduce((sum, r) => sum + r.score, 0);
      const totalPossible = userResults.reduce((sum, r) => sum + r.totalQuestions, 0);
      const averagePercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
      
      const categoryStats: Record<string, number> = {};
      userResults.forEach(r => {
        categoryStats[r.subject] = (categoryStats[r.subject] || 0) + 1;
      });

      const topSubject = Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Japan', 'Brazil', 'Singapore'];
      const hash = user.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const country = countries[hash % countries.length];

      return {
        ...user,
        totalQuizzes,
        averagePercentage,
        topSubject,
        categoryStats,
        country
      };
    }).sort((a, b) => b.totalQuizzes - a.totalQuizzes); 
  }, [users, allResults]);

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 animate-slide-up pt-40 pb-20 px-4">
      
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <ShieldAlert size={32} className="text-red-500" />
            </div>
            <div>
                <h1 className="text-4xl font-display font-bold text-white">Admin Dashboard</h1>
                <p className="text-slate-400 text-lg">User analytics and global system control</p>
            </div>
          </div>
          
          {/* UPLOAD SECTION IN ADMIN DASHBOARD */}
          <div className="md:ml-auto w-full md:w-auto">
             <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-col gap-3">
                 <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-green-400"/> Global Question Bank
                 </h3>
                 <label className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer transition-colors font-bold text-sm shadow-lg shadow-indigo-500/20">
                    {isUploading ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span> : <Upload size={16} />}
                    {isUploading ? 'Uploading...' : 'Upload Excel Master File'}
                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                 </label>
                 {uploadStatus && (
                     <div className={`text-xs flex items-center gap-1.5 font-bold ${uploadStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                         {uploadStatus.type === 'success' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                         {uploadStatus.message}
                     </div>
                 )}
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start mb-2">
                  <div className="text-slate-400 font-bold text-xs uppercase tracking-wider">Total Users</div>
                  <Globe size={18} className="text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-white">{users.length}</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-green-500">
              <div className="flex justify-between items-start mb-2">
                  <div className="text-slate-400 font-bold text-xs uppercase tracking-wider">Total Quizzes Taken</div>
                  <Activity size={18} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-white">{allResults.length}</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
              <div className="flex justify-between items-start mb-2">
                  <div className="text-slate-400 font-bold text-xs uppercase tracking-wider">Global Avg. Score</div>
                  <TrendingUp size={18} className="text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-white">
                 {allResults.length > 0 
                    ? Math.round(allResults.reduce((a, b) => a + b.percentage, 0) / allResults.length) 
                    : 0}%
              </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-orange-500">
              <div className="flex justify-between items-start mb-2">
                  <div className="text-slate-400 font-bold text-xs uppercase tracking-wider">Active Today</div>
                  <BarChart2 size={18} className="text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-white">
                 {new Set(allResults.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).map(r => r.userEmail)).size}
              </div>
          </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border-slate-700/50">
        <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/30">
            <h3 className="font-bold text-xl text-white">Registered Users</h3>
            <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">
                Updated: {format(new Date(), 'HH:mm:ss')}
            </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 text-xs uppercase tracking-wider font-semibold">
                <th className="p-5">User Identity</th>
                <th className="p-5">Origin</th>
                <th className="p-5 text-center">Quizzes</th>
                <th className="p-5 text-center">Avg. Score</th>
                <th className="p-5">Top Category</th>
                <th className="p-5">Category Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {processedUsers.map((user) => (
                <tr key={user.email} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-5">
                      <div className="flex items-center gap-3">
                          {user.avatar ? (
                             <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-600 object-cover" />
                          ) : (
                             <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400">
                                {user.username.charAt(0)}
                             </div>
                          )}
                          <div>
                              <div className="font-bold text-white">{user.username}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <Mail size={10} /> {user.email}
                              </div>
                              <div className="text-[10px] text-slate-600 mt-1">
                                  Joined: {format(new Date(user.joinedAt), 'MMM d, yyyy')}
                              </div>
                          </div>
                      </div>
                  </td>
                  <td className="p-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
                          <Globe size={12} className="text-blue-400" /> {user.country}
                      </span>
                  </td>
                  <td className="p-5 text-center">
                      <div className="text-lg font-bold text-white">{user.totalQuizzes}</div>
                  </td>
                  <td className="p-5 text-center">
                      <div className={`text-lg font-bold ${user.averagePercentage >= 70 ? 'text-green-400' : user.averagePercentage >= 50 ? 'text-yellow-400' : 'text-slate-400'}`}>
                          {user.averagePercentage}%
                      </div>
                  </td>
                  <td className="p-5">
                      {user.topSubject !== '-' ? (
                          <span className="text-sm text-indigo-300 font-medium">{user.topSubject}</span>
                      ) : (
                          <span className="text-slate-600">-</span>
                      )}
                  </td>
                  <td className="p-5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                          {Object.entries(user.categoryStats).length > 0 ? (
                              Object.entries(user.categoryStats).map(([cat, count]) => (
                                  <span key={cat} className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400" title={`${count} quizzes`}>
                                      {cat}: <span className="text-white font-bold">{count}</span>
                                  </span>
                              ))
                          ) : (
                              <span className="text-slate-600 text-xs italic">No activity</span>
                          )}
                      </div>
                  </td>
                </tr>
              ))}
              {processedUsers.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                          No registered users found in Cloud Database.
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

export default AdminDashboard;

