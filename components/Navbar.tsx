
import React, { useEffect } from 'react';
import { LogOut, Trophy, User as UserIcon, Home, Zap, ShieldAlert } from 'lucide-react';
import { User as UserType } from '../types';
import { ADMIN_EMAIL } from '../constants';

interface NavbarProps {
  user: UserType;
  onLogout: () => void;
  currentView: string;
  onChangeView: (view: any) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, currentView, onChangeView }) => {
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  useEffect(() => {
    // Helpful debug for the user trying to access admin
    if (user && !isAdmin) {
      console.log(`%c[Admin Check] Logged in as: "${user.email}"`, 'color: yellow');
      console.log(`%c[Admin Check] Required Admin Email: "${ADMIN_EMAIL}"`, 'color: orange');
      console.log(`%c[Admin Check] To fix: Add VITE_ADMIN_EMAIL="${user.email}" to your .env file or Vercel settings.`, 'color: lightblue');
    } else if (isAdmin) {
      console.log(`%c[Admin Check] You are logged in as Admin.`, 'color: lightgreen; font-weight: bold;');
    }
  }, [user, isAdmin]);

  const navItems = [
    { id: 'welcome', label: 'Home', icon: Home },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 glass-panel border-b border-blue-900/50 bg-[#020617]/90 backdrop-blur-md">
      <div className="container mx-auto px-2 md:px-4 h-20 md:h-24 flex items-center justify-between">
        {/* Logo Section */}
        <div 
          className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          onClick={() => onChangeView('welcome')}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transform rotate-3">
            <Zap size={20} className="text-white fill-white md:w-6 md:h-6" />
          </div>
          {/* Hidden on mobile to prevent overflow causing logout icon to disappear */}
          <span className="hidden md:block text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-indigo-200">
            QuizzyVibes
          </span>
        </div>

        {/* Unified Right Side Navigation & User Actions */}
        <div className="flex bg-slate-900/60 rounded-xl p-1 md:p-1.5 border border-slate-800 gap-1 md:gap-1.5 items-center flex-shrink-0">
            
            {/* Admin Button - Only for Admin */}
            {isAdmin && (
              <button
                onClick={() => onChangeView('admin')}
                className={`flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-sm font-bold transition-all ${
                  currentView === 'admin'
                    ? 'bg-red-500/20 text-red-200 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                }`}
                title="Admin Dashboard"
              >
                <ShieldAlert size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}

            {/* Regular Nav Items */}
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-700 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={item.label}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}

            {/* Separator */}
            <div className="w-px h-5 md:h-6 bg-slate-700 mx-0.5 md:mx-1"></div>

            {/* User Avatar */}
            <div className="flex items-center justify-center px-0.5 md:px-1">
                {user.avatar ? (
                   <img 
                      src={user.avatar} 
                      alt="User" 
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-indigo-500/50 shadow-sm"
                      key={user.avatar} // Force re-render if avatar string changes
                   />
                ) : (
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs md:text-sm font-bold text-indigo-300 border border-indigo-500/20 shadow-inner">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
            </div>

            {/* Logout */}
            <button
               onClick={onLogout}
               className="flex-shrink-0 flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
               title="Log Out"
             >
               <LogOut size={18} />
            </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;




