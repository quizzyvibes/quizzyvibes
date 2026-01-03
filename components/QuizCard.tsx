
import React from 'react';
import { Question } from '../types';
import { Info, ThumbsUp, CheckCircle2 } from 'lucide-react';

interface QuizCardProps {
  question: Question;
  selectedAnswer?: string;
  onSelectAnswer: (answer: string) => void;
  showFeedback?: boolean;
  hiddenOptions?: string[]; // New prop for 50/50
}

const QuizCard: React.FC<QuizCardProps> = ({ question, selectedAnswer, onSelectAnswer, showFeedback, hiddenOptions = [] }) => {

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass-panel p-6 md:p-10 rounded-[2rem] shadow-2xl shadow-blue-900/20 animate-fade-in relative overflow-hidden border border-blue-500/20">
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        {/* Question Header - Centered */}
        <h2 className="text-xl md:text-3xl font-display font-bold text-white mb-10 leading-snug relative z-10 text-center">
          {question.text}
        </h2>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          {question.options.map((option, idx) => {
            const isHidden = hiddenOptions.includes(option);
            
            // If hidden, render a placeholder or invisible button to keep grid layout stable
            if (isHidden) {
               return (
                 <div key={idx} className="p-5 rounded-2xl border border-transparent opacity-0 pointer-events-none" aria-hidden="true">
                    Hidden Option
                 </div>
               );
            }

            let buttonStyle = "bg-slate-800/40 hover:bg-slate-700/60 border-slate-700 text-slate-200";
            let icon = null;

            if (showFeedback) {
              if (option === question.correctAnswer) {
                // Correct Answer Style
                buttonStyle = "bg-green-500/20 border-green-500 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                icon = <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 animate-bounce"><ThumbsUp size={24} fill="currentColor" /></div>;
              } else if (option === selectedAnswer && option !== question.correctAnswer) {
                // Wrong Answer Style
                buttonStyle = "bg-red-500/20 border-red-500 text-red-100";
              } else {
                 // Unselected Options when feedback is shown
                 buttonStyle = "opacity-40 bg-slate-900/20 border-slate-800 grayscale";
              }
            } else if (selectedAnswer === option) {
              // Selected state (before feedback)
              buttonStyle = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900";
            }

            return (
              <button
                key={idx}
                onClick={() => !showFeedback && onSelectAnswer(option)}
                disabled={showFeedback}
                className={`relative p-5 rounded-2xl text-left border transition-all duration-200 flex items-center group ${buttonStyle}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mr-4 border-2 transition-colors ${
                   showFeedback && option === question.correctAnswer ? 'border-green-400 bg-green-500 text-white' : 
                   showFeedback && option === selectedAnswer ? 'border-red-400 bg-red-500 text-white' :
                   'border-slate-600 bg-slate-800/50 text-slate-400 group-hover:border-blue-400 group-hover:text-blue-200'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-lg font-medium leading-tight pr-8">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Explanation Area */}
        {showFeedback && (
           <div className="mt-8 pt-6 border-t border-blue-500/20 animate-slide-up relative z-10">
               <div className="flex items-start gap-4 bg-blue-900/30 p-5 rounded-xl border border-blue-500/30">
                   <div className="mt-1 p-2 bg-blue-500/20 rounded-lg text-blue-300">
                       <Info size={24} />
                   </div>
                   <div className="flex-1">
                       <h4 className="font-bold text-blue-200 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                         Explanation
                       </h4>
                       <p className="text-blue-50 text-lg leading-relaxed">
                         {question.explanation || "No explanation provided for this question."}
                       </p>
                   </div>
               </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default QuizCard;
