import React from 'react';
import { Sparkles } from 'lucide-react';

/** AI source row — visible with "בקרוב" until unlocked via 10 taps or ?test=true */
export default function AiSourceOption({ aiEnabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-right ${
        aiEnabled
          ? 'border-[#e8e8e8] bg-white hover:border-purple-300 hover:bg-purple-50'
          : 'border-[#e8e8e8] bg-gray-50 opacity-70 cursor-not-allowed'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        aiEnabled ? 'bg-purple-100' : 'bg-gray-100'
      }`}>
        <Sparkles className={`w-5 h-5 ${aiEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[16px] font-semibold ${aiEnabled ? 'text-[#464646]' : 'text-[#464646]/50'}`}>
            רוצה לתפור משהו משלי
          </span>
          {!aiEnabled && (
            <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">בקרוב</span>
          )}
        </div>
        <p className="text-[13px] text-[#464646]/60 mt-0.5">עיצוב מותאם אישית בעזרת AI</p>
      </div>
    </button>
  );
}
