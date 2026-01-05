
import React, { useState } from 'react';
import Button from './Button';
import { loginWithGoogle, loginAsGuest } from '../services/firebase';
import { User } from '../types';
import { Zap, User as UserIcon, AlertCircle } from 'lucide-react';

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
      console.error("Login Error:", err);
      
      let msg = "Login failed. ";
      if (err.code === 'auth/unauthorized-domain') {
        msg = "Domain not authorized. Go to Firebase Console > Authentication > Settings > Authorized Domains and add this website's URL.";
      } else if (err.code === 'auth/api-key-not-valid') {
        msg = "Invalid API Key. Please check your Vercel Environment Variables.";
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = "Sign-in cancelled.";
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginAsGuest();
      onLogin(user);
    } catch (err: any) {
      setError("Guest login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 glass-panel rounded-3xl animate-fade-in shadow-2xl relative border border-blue-500/20">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30 transform rotate-3">
             <Zap className="text-white fill-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          QuizzyVibes
        </h1>
        <p className="text-slate-400">
          Thousands of quizzes across 16 subjects! Test your knowledge and learn something new today
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-xs flex gap-2 items-start">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button fullWidth isLoading={isLoading} onClick={handleGoogleLogin} className="h-14 text-lg bg-white hover:bg-slate-100 text-slate-900 shadow-xl shadow-white/10 flex items-center justify-center gap-3">
           <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" />
           Sign in with Google
        </Button>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">OR</span>
            <div className="flex-grow border-t border-slate-700"></div>
        </div>

        <div>
            <Button 
                fullWidth 
                onClick={handleGuestLogin} 
                variant="secondary"
                className="h-12 text-base flex items-center justify-center gap-2 mb-2"
            >
                <UserIcon size={18} />
                Continue as Guest
            </Button>
            <p className="text-slate-500 text-sm text-center">
              Guest scores are stored temporarily. Sign in to save progress.
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;




