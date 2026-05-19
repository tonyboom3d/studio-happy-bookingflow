import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Users, Baby, MessageCircle, Info } from 'lucide-react';
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
  // חישוב מקומות בפועל: הורה+ילד = מקום אחד
  // מבוגרים שמלווים ילדים לא תופסים מקום נוסף
  const parentChildPairs = Math.min(adults, children); // זוגות הורה+ילד
  const soloAdults = adults - parentChildPairs; // מבוגרים ללא ילד
  const spotsUsed = parentChildPairs + soloAdults; // = adults (כי הילד לא תופס מקום נוסף)
  
  const totalParticipants = adults + children;
  const isGroupTooLarge = totalParticipants > 9;

  // חישוב מחיר לפי שירות
  // מבוגרים רגילים + הורה+ילד (מחיר מיוחד)
  const { regularAdultsPrice, parentChildPrice, totalPrice } = useMemo(() => {
    if (!selectedSlot || !pricingByService) {
      return { regularAdultsPrice: 0, parentChildPrice: 0, totalPrice: 0 };
    }
    const servicePricing = pricingByService[selectedSlot.serviceId];
    if (!servicePricing) {
      return { regularAdultsPrice: 0, parentChildPrice: 0, totalPrice: 0 };
    }

    // מחיר למבוגרים רגילים (ללא ילד)
    const pricePerAdult = servicePricing[1] || 250;
    const regularPrice = soloAdults * pricePerAdult;

    // מחיר הורה+ילד (מחיר מיוחד - יגיע מה-API)
    const parentChildTicketPrice = servicePricing['parentChild'] || servicePricing[1] || 250;
    const pairsPrice = parentChildPairs * parentChildTicketPrice;

    return {
      regularAdultsPrice: regularPrice,
      parentChildPrice: pairsPrice,
      totalPrice: regularPrice + pairsPrice
    };
  }, [selectedSlot, pricingByService, soloAdults, parentChildPairs]);

  const handleAdultsDecrease = () => {
    if (adults > 1) {
      // אם מורידים מבוגר, צריך לוודא שעדיין יש מספיק מבוגרים לילדים
      if (adults - 1 < children) {
        setChildren(adults - 1);
      }
      setAdults(adults - 1);
    }
  };

  const handleAdultsIncrease = () => {
    // מבוגר חדש תופס מקום (אלא אם יש ילד שממתין לו)
    const newSpotsUsed = children > adults ? spotsUsed : spotsUsed + 1;
    if (newSpotsUsed > maxParticipants) return;
    setAdults(adults + 1);
  };

  const handleChildrenDecrease = () => {
    if (children > 0) setChildren(children - 1);
  };

  const handleChildrenIncrease = () => {
    // ילד לא תופס מקום נוסף (מצטרף להורה)
    // אבל חייב להיות לו הורה
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
            disabled={spotsUsed >= maxParticipants && children <= adults}
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
            disabled={children >= adults}
            className="w-10 h-10 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                       text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* הסבר על הורה+ילד */}
      {children > 0 && (
        <div className="w-full max-w-sm mb-4 rounded-lg border border-[#5E2F88]/20 bg-[#5E2F88]/5 p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#5E2F88] mt-0.5 shrink-0" />
            <div className="text-xs text-[#464646]/80">
              <p className="font-medium text-[#581E83] mb-1">הורה + ילד = שטיח אחד</p>
              <p>ילד מצטרף להורה ועובדים יחד על שטיח אחד. זוג הורה+ילד לא תופס מקום נוסף בסדנה.</p>
            </div>
          </div>
        </div>
      )}

      {/* הערה על זמינות */}
      {maxParticipants < 10 && (
        <div className="text-xs text-[#464646]/60 text-center mb-4">
          נשארו {maxParticipants} מקומות פנויים בתאריך שנבחר
          {spotsUsed > 0 && ` (תופסים ${spotsUsed} מקומות)`}
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
            <div className="text-sm text-[#464646] opacity-70 space-y-1">
              {soloAdults > 0 && (
                <p>{soloAdults} {soloAdults === 1 ? 'מבוגר' : 'מבוגרים'}</p>
              )}
              {parentChildPairs > 0 && (
                <p>{parentChildPairs} {parentChildPairs === 1 ? 'זוג' : 'זוגות'} הורה + ילד</p>
              )}
            </div>
            {totalPrice > 0 && (
              <p className="text-lg font-semibold text-[#5E2F88] mt-2">
                ₪{totalPrice} לסדנה
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
