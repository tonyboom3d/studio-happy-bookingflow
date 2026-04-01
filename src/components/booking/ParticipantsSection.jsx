import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Users, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRICING = {
  1: 340,
  2: 600,
  3: 795,
  4: 980
};

export default function ParticipantsSection({ participants, setParticipants, onContinue }) {
  const isGroupTooLarge = participants > 4;
  const ticketPrice = PRICING[participants] || 340;

  const handleDecrease = () => {
    if (participants > 1) setParticipants(participants - 1);
  };

  const handleIncrease = () => {
    setParticipants(participants + 1);
  };

  return (
    <div className="flex flex-col items-center py-6">
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
          className="w-12 h-12 rounded-full border-2 border-[#ADC178] flex items-center justify-center
                     text-[#ADC178] hover:bg-[#ADC178] hover:text-white"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isGroupTooLarge ? (
          <motion.div
            key="contact"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 flex flex-col items-center gap-3 text-center"
          >
            <p className="text-sm text-[#464646]/80 max-w-[220px] leading-relaxed">
              מעל ל־4 משתתפים דורש תיאום קצת שונה
            </p>
            <Button
              onClick={() => window.open('https://www.canbonim.com/contact', '_self')}
              className="bg-[#6B584C] hover:bg-[#5a4940] text-white px-6 py-2.5 rounded-lg flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              דברו איתנו
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="pricing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 text-center"
          >
            <p className="text-sm text-[#464646] opacity-70">
              {participants === 1 ? "משתתף אחד" : participants === 2 ? "שני משתתפים" : participants === 3 ? "שלושה משתתפים" : "ארבעה משתתפים"}
            </p>
            <p className="text-lg font-semibold text-[#ADC178] mt-1">
              ₪{ticketPrice} למפגש
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!isGroupTooLarge && (
        <Button
          onClick={onContinue}
          className="mt-8 bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg text-lg"
        >
          המשך לבחירת סוג עץ
        </Button>
      )}
    </div>
  );
}
