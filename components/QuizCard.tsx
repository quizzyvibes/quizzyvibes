
import React from 'react';
import { Question } from '../types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface QuizCardProps {
  question: Question;
  selectedAnswer?: string;
  onSelectAnswer: (answer: string) => void;
  showFeedback?: boolean;
  hiddenOptions?: string[]; // New prop for 50/50
}

const QuizCard: React.FC<QuizCardProps> = ({ question, selectedAnswer, onSelectAnswer, showFeedback, hiddenOptions = [] }) => {

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      <div className="glass-panel p-3 md:p-6 rounded-3xl shadow-2xl shadow-blue-900/20 relative overflow-hidden border border-blue-500/20 flex flex-col h-full">
        
        {/* Background FX */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        {/* Dedicated Framed Question Box */}
        {/* 
           UPDATES: 
           1. min-h-[140px] for mobile (Adjusted from 220px based on feedback).
           2. md:min-h-[110px] keeps PC/Tablet compact.
        */}
        <div className="flex-shrink-0 mb-3 md:mb-5 relative z-10 bg-slate-950/50 border border-slate-700/50 rounded-2xl p-4 min-h-[140px] md:min-h-[110px] w-full md:max-w-4xl md:mx-auto flex items-center justify-center overflow-y-auto custom-scrollbar shadow-inner">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-white leading-snug text-center">
                {question.text}
            </h2>
        </div>

        {/* Options Grid */}
        <div className="flex-1 grid grid-cols-1 gap-3 relative z-10 min-h-0 overflow-y-auto pr-1 pb-1 content-center w-full md:max-w-2xl md:mx-auto">
          {question.options.map((option, idx) => {
            const isHidden = hiddenOptions.includes(option);
            
            let buttonStyle = "bg-slate-800/40 border-slate-700 text-slate-200";
            let icon = null;

            if (showFeedback) {
              // On reveal, maintain same size and layout
              if (option === question.correctAnswer) {
                buttonStyle = "bg-green-600/20 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                icon = <CheckCircle2 size={24} className="ml-auto text-green-400 flex-shrink-0" />;
              } else if (option === selectedAnswer && option !== question.correctAnswer) {
                buttonStyle = "bg-red-600/20 border-red-500 text-red-200 opacity-90";
                icon = <AlertCircle size={24} className="ml-auto text-red-400 flex-shrink-0" />;
              } else {
                 buttonStyle = "opacity-40 bg-slate-900/20 border-slate-800 grayscale";
              }
            } else if (selectedAnswer === option) {
              buttonStyle = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900";
            } else {
                buttonStyle += " hover:bg-slate-700/60 hover:text-white";
            }

            if (isHidden) {
               return <div key={idx} className="hidden" aria-hidden="true"></div>;
            }

            return (
              <button
                key={idx}
                onClick={() => !showFeedback && onSelectAnswer(option)}
                disabled={showFeedback}
                className={`relative w-full py-3 md:py-3.5 px-4 md:px-6 rounded-xl text-left border-2 transition-all duration-200 flex items-center group ${buttonStyle}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold mr-4 border-2 transition-colors ${
                   showFeedback && option === question.correctAnswer ? 'border-green-400 bg-green-500/20 text-green-300' : 
                   showFeedback && option === selectedAnswer ? 'border-red-400 bg-red-500/20 text-red-300' :
                   'border-slate-600 bg-slate-800/50 text-slate-400 group-hover:border-blue-400 group-hover:text-blue-200'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                {/* Responsive font size for options */}
                <span className="text-lg md:text-xl font-semibold leading-tight pr-2">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;







