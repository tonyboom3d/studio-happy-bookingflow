import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParticipantsSection({ participants, setParticipants, onContinue }) {
  const handleDecrease = () => {
    if (participants > 1) setParticipants(participants - 1);
  };

  const handleIncrease = () => {
    if (participants < 3) setParticipants(participants + 1);
  };

  return (
    <div className="flex flex-col items-center py-6">
      <div className="flex items-center justify-center gap-2 mb-6 text-[#6B584C]">
        <Users className="w-6 h-6" />
        <span className="text-lg">כמה תהיו?</span>
      </div>
      
      <div className="flex items-center gap-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleDecrease}
          disabled={participants <= 1}
          className="w-12 h-12 rounded-full border-2 border-[#ADC178] flex items-center justify-center
                     text-[#ADC178] hover:bg-[#ADC178] hover:text-white transition-all duration-200
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#ADC178]"
        >
          <Minus className="w-5 h-5" />
        </motion.button>
        
        <motion.div
          key={participants}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-bold text-[#6B584C] w-16 text-center"
        >
          {participants}
        </motion.div>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleIncrease}
          disabled={participants >= 3}
          className="w-12 h-12 rounded-full border-2 border-[#ADC178] flex items-center justify-center
                     text-[#ADC178] hover:bg-[#ADC178] hover:text-white transition-all duration-200
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#ADC178]"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>
      
      <p className="mt-4 text-sm text-[#464646] opacity-70">
        {participants === 1 ? "משתתף אחד" : `${participants} משתתפים`}
      </p>
      
      <Button
        onClick={onContinue}
        className="mt-8 bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                   transition-all duration-200 text-lg"
      >
        המשך
      </Button>
    </div>
  );
}