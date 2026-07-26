import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * AI source row in the catalog-vs-AI picker.
 * Hidden until unlocked (?test=true or 10 secret taps on the invisible zone).
 */
export default function AiSourceOption({ aiEnabled, onSecretTap, onChoose }) {
  if (!aiEnabled) {
    // Invisible tap zone at the bottom of the modal — no visible UI, no extra layout space
    return (
      <button
        type="button"
        onClick={onSecretTap}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-x-5 bottom-5 h-20 opacity-0 cursor-default z-10"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onChoose}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-[#e8e8e8] bg-white hover:border-purple-300 hover:bg-purple-50 transition-all text-right"
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-purple-100">
        <Sparkles className="w-5 h-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[16px] font-semibold text-[#464646]">רוצה לתפור משהו משלי</span>
        <p className="text-[13px] text-[#464646]/60 mt-0.5">עיצוב מותאם אישית בעזרת AI</p>
      </div>
    </button>
  );
}
