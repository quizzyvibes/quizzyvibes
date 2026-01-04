
import React, { useState } from 'react';
import Button from './Button';
import { loginWithGoogle } from '../services/firebase';
import { User } from '../types';
import { LogIn, Globe } from 'lucide-react';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      onLogin(user);
    } catch (err: any) {
      setError("Failed to sign in with Google. Please check your internet connection.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 glass-panel rounded-3xl animate-fade-in shadow-2xl relative border border-blue-500/20">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30 transform rotate-3">
             <Globe className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          QuizzyVibes
        </h1>
        <p className="text-slate-400">
          Sign in to access global leaderboards, save your progress, and challenge friends.
        </p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <Button fullWidth isLoading={isLoading} onClick={handleGoogleLogin} className="h-14 text-lg bg-white hover:bg-slate-100 text-slate-900 shadow-xl shadow-white/10 flex items-center justify-center gap-3">
           <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" />
           Sign in with Google
        </Button>
      </div>

      <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
        <p className="text-slate-500 text-xs">
          By signing in, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
