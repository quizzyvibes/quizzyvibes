
import React from 'react';
import { Question } from '../types';
import { ThumbsUp, CheckCircle2, AlertCircle } from 'lucide-react';

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
      <div className="glass-panel p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl shadow-blue-900/20 relative overflow-hidden border border-blue-500/20 flex flex-col h-full">
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        {/* Question Header - Centered & Scrollable if massive, but kept tight */}
        <div className="flex-shrink-0 mb-4 max-h-[30vh] overflow-y-auto custom-scrollbar relative z-10 text-center flex items-center justify-center">
            <h2 className="text-xl md:text-3xl font-display font-bold text-white leading-tight">
            {question.text}
            </h2>
        </div>

        {/* Options Grid - Flex grow to fill space */}
        <div className="flex-1 grid grid-cols-1 gap-2 md:gap-4 relative z-10 min-h-0 overflow-y-auto pr-1">
          {question.options.map((option, idx) => {
            const isHidden = hiddenOptions.includes(option);
            
            // If hidden, render invisible to keep layout structure or just hide
            // For 50/50, standard practice is to hide them but keep space or remove them.
            // Here we fade them out completely.
            
            let buttonStyle = "bg-slate-800/40 border-slate-700 text-slate-200";
            let icon = null;

            if (showFeedback) {
              if (option === question.correctAnswer) {
                // Correct Answer Style
                buttonStyle = "bg-green-500 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]";
                icon = <CheckCircle2 size={24} className="ml-auto text-white animate-bounce" />;
              } else if (option === selectedAnswer && option !== question.correctAnswer) {
                // Wrong Answer Style
                buttonStyle = "bg-red-500 border-red-400 text-white opacity-90";
                icon = <AlertCircle size={24} className="ml-auto text-white" />;
              } else {
                 // Unselected Options when feedback is shown
                 buttonStyle = "opacity-30 bg-slate-900/20 border-slate-800 grayscale";
              }
            } else if (selectedAnswer === option) {
              // Selected state (before feedback)
              buttonStyle = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900";
            } else {
                // Default Hover
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
                className={`relative w-full p-3 md:p-5 rounded-xl text-left border-2 transition-all duration-200 flex items-center group ${buttonStyle}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lg md:text-xl font-bold mr-3 md:mr-4 border-2 transition-colors ${
                   showFeedback && option === question.correctAnswer ? 'border-white bg-white/20 text-white' : 
                   showFeedback && option === selectedAnswer ? 'border-white bg-white/20 text-white' :
                   'border-slate-600 bg-slate-800/50 text-slate-400 group-hover:border-blue-400 group-hover:text-blue-200'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-lg md:text-2xl font-semibold leading-tight pr-2">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>
        
        {/* Compact Feedback - Overlay/Bottom section that doesn't push layout if possible. 
            However, we simply render it. The parent flex container handles spacing. 
        */}
        {showFeedback && question.explanation && (
            <div className="mt-2 pt-2 border-t border-blue-500/20 relative z-10 flex-shrink-0">
                <p className="text-xs md:text-sm text-blue-200 leading-snug line-clamp-3">
                    <span className="font-bold text-blue-400 uppercase mr-2">Info:</span>
                    {question.explanation}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default QuizCard;

