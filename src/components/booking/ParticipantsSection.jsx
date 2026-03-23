import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const PRICING = {
  1: 300,
  2: 500,
  3: 650
};

export default function ParticipantsSection({ participants, setParticipants, onContinue }) {
  const ticketPrice = PRICING[participants] || 300;
  const handleDecrease = () => {
    if (participants > 1) setParticipants(participants - 1);
  };

  const handleIncrease = () => {
    if (participants < 3) setParticipants(participants + 1);
  };

  return (
    <div className="flex flex-col items-center py-6">
      {/* הנחייה */}
      <p className="text-sm text-[#464646]/70 mb-2">כמה תהיו?</p>
      
      <div className="flex items-center justify-center gap-2 mb-6 text-[#6B584C]">
        <Users className="w-6 h-6" />
        <span className="text-lg">מספר משתתפים</span>
      </div>
      
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={participants <= 1}
          className="w-12 h-12 rounded-full border-2 border-[#ADC178] flex items-center justify-center
                     text-[#ADC178] hover:bg-[#ADC178] hover:text-white
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#ADC178]"
        >
          <Minus className="w-5 h-5" />
        </button>
        
        <motion.div
          key={participants}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-bold text-[#6B584C] w-16 text-center"
        >
          {participants}
        </motion.div>
        
        <button
          type="button"
          onClick={handleIncrease}
          disabled={participants >= 3}
          className="w-12 h-12 rounded-full border-2 border-[#ADC178] flex items-center justify-center
                     text-[#ADC178] hover:bg-[#ADC178] hover:text-white
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#ADC178]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-[#464646] opacity-70">
          {participants === 1 ? "משתתף אחד" : `${participants} משתתפים`}
        </p>
        <p className="text-lg font-semibold text-[#ADC178] mt-1">
          ₪{ticketPrice} למפגש
        </p>
      </div>
      
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1
        }}
      >
        <Button
          onClick={onContinue}
          className="mt-8 bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg"
        >
          המשך לבחירת סוג עץ
        </Button>
      </motion.div>
    </div>
  );
}