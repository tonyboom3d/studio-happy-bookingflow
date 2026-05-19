import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Users, Baby, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ParticipantsSection({
  adults,
  setAdults,
  children,
  setChildren,
  maxParticipants = 10,
  pricingByService,
  selectedSlot,
  onContinue
}) {
  const totalParticipants = adults + children;
  const isGroupTooLarge = totalParticipants > 9;

  // חישוב מחיר לפי שירות ומספר מבוגרים
  const currentPrice = useMemo(() => {
    if (!selectedSlot || !pricingByService) return 0;
    const servicePricing = pricingByService[selectedSlot.serviceId];
    if (!servicePricing) return 0;
    return servicePricing[adults] || servicePricing[1] * adults;
  }, [selectedSlot, pricingByService, adults]);

  const handleAdultsDecrease = () => {
    if (adults > 1) setAdults(adults - 1);
  };

  const handleAdultsIncrease = () => {
    if (totalParticipants >= maxParticipants) return;
    setAdults(adults + 1);
  };

  const handleChildrenDecrease = () => {
    if (children > 0) setChildren(children - 1);
  };

  const handleChildrenIncrease = () => {
    if (totalParticipants >= maxParticipants) return;
    if (children >= adults) return; // ילד חייב הורה
    setChildren(children + 1);
  };

  return (
    <div className="flex flex-col items-center py-6">
      <p className="text-sm text-[#464646]/70 mb-4">כמה משתתפים יהיו בסדנה?</p>

      {/* מבוגרים */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[#581E83]">
            <Users className="w-5 h-5" />
            <span className="font-medium">מבוגרים</span>
            <span className="text-xs text-[#464646]/60">(גילאי 14+)</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleAdultsDecrease}
            disabled={adults <= 1}
            className="w-10 h-10 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                       text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <motion.div
            key={adults}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-[#581E83] w-12 text-center"
          >
            {adults}
          </motion.div>
          
          <button
            type="button"
            onClick={handleAdultsIncrease}
            disabled={totalParticipants >= maxParticipants}
            className="w-10 h-10 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                       text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ילדים */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[#581E83]">
            <Baby className="w-5 h-5" />
            <span className="font-medium">ילדים</span>
            <span className="text-xs text-[#464646]/60">(גילאי 8-13)</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleChildrenDecrease}
            disabled={children <= 0}
            className="w-10 h-10 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                       text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <motion.div
            key={children}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-[#581E83] w-12 text-center"
          >
            {children}
          </motion.div>
          
          <button
            type="button"
            onClick={handleChildrenIncrease}
            disabled={totalParticipants >= maxParticipants || children >= adults}
            className="w-10 h-10 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                       text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {children > 0 && (
          <p className="text-xs text-[#464646]/60 text-center mt-2">
            * ילד מצטרף להורה ועובדים יחד על שטיח אחד
          </p>
        )}
      </div>

      {/* הערה על זמינות */}
      {maxParticipants < 10 && (
        <div className="text-xs text-[#464646]/60 text-center mb-4">
          נשארו {maxParticipants} מקומות פנויים בתאריך שנבחר
        </div>
      )}

      <AnimatePresence mode="wait">
        {isGroupTooLarge ? (
          <motion.div
            key="large-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex flex-col items-center gap-3 text-center"
          >
            <p className="text-sm text-[#464646]/80 max-w-[280px] leading-relaxed">
              לקבוצות מעל 9 משתתפים יש לנו הצעות מיוחדות!
            </p>
            <a
              href="https://wa.link/jbfarf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-2.5 text-white font-medium hover:bg-[#20bd5a] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              אנחנו קבוצה גדולה - מעל ל 9 משתתפים
            </a>
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
              סה"כ: {adults} {adults === 1 ? 'מבוגר' : 'מבוגרים'}
              {children > 0 && ` + ${children} ${children === 1 ? 'ילד' : 'ילדים'}`}
            </p>
            {currentPrice > 0 && (
              <p className="text-lg font-semibold text-[#5E2F88] mt-1">
                ₪{currentPrice} לסדנה
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* לינק לקבוצות גדולות - מוצג תמיד כשלא עברו את הסף */}
      {!isGroupTooLarge && totalParticipants >= 5 && (
        <div className="mt-4">
          <a
            href="https://wa.link/jbfarf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#5E2F88] underline hover:no-underline"
          >
            אנחנו קבוצה גדולה - מעל ל 9 משתתפים
          </a>
        </div>
      )}

      {!isGroupTooLarge && (
        <Button
          onClick={onContinue}
          className="mt-8 bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-3 rounded-lg text-lg"
        >
          המשך לבחירת גודל שטיח
        </Button>
      )}
    </div>
  );
}
