import React, { useState } from 'react';
import Button from './Button';
import { loginUser, registerUser } from '../services/storageService';
import { User } from '../types';
import { LogIn, UserPlus, Lock, Mail, User as UserIcon } from 'lucide-react';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); // Only for register
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate network delay for effect
    setTimeout(() => {
      try {
        const cleanEmail = email.trim();
        if (!cleanEmail) throw new Error("Email is required");
        
        let user: User;
        if (isLogin) {
          user = loginUser(cleanEmail);
        } else {
          if (!username.trim()) throw new Error("Username is required");
          user = registerUser(cleanEmail, username.trim());
        }
        onLogin(user);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 glass-panel rounded-3xl animate-fade-in shadow-2xl relative">
      <div className="text-center mb-8">
        <img 
          src="/logo.png" 
          alt="QuizzyVibes" 
          className="w-48 mx-auto mb-6 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
        <h1 className="text-3xl font-bold text-white mb-2">
          {isLogin ? 'Welcome Back' : 'Join QuizMaster'}
        </h1>
        <p className="text-slate-400">
          {isLogin ? 'Sign in to continue your streak' : 'Create an account to track progress'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isLogin && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3.5 text-slate-500" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Choose a username"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="name@example.com"
            />
          </div>
        </div>

        {/* Note: Password field omitted per simplicity of mock backend description in thought process, 
            but adding visual dummy field for realism if desired. 
            However, keeping it simple: just Email acts as identity for this local demo.
            Wait, let's add a dummy password field for UX completeness. */}
        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                    type="password"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                />
            </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <Button fullWidth isLoading={isLoading}>
          {isLogin ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-slate-400 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;