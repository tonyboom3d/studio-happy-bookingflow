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
  const parentChildPairs = Math.min(adults, children);
  const soloAdults = adults - parentChildPairs;
  const spotsUsed = parentChildPairs + soloAdults;
  const totalParticipants = adults + children;
  const isGroupTooLarge = totalParticipants > 9;

  const { totalPrice } = useMemo(() => {
    if (!selectedSlot || !pricingByService) {
      return { totalPrice: 0 };
    }
    const servicePricing = pricingByService[selectedSlot.serviceId];
    if (!servicePricing) return { totalPrice: 0 };

    const pricePerAdult = servicePricing[1] || 250;
    const regularPrice = soloAdults * pricePerAdult;
    const parentChildTicketPrice = servicePricing['parentChild'] || servicePricing[1] || 250;
    const pairsPrice = parentChildPairs * parentChildTicketPrice;

    return { totalPrice: regularPrice + pairsPrice };
  }, [selectedSlot, pricingByService, soloAdults, parentChildPairs]);

  const handleAdultsDecrease = () => {
    if (adults > 1) {
      if (adults - 1 < children) setChildren(adults - 1);
      setAdults(adults - 1);
    }
  };
  const handleAdultsIncrease = () => {
    const newSpotsUsed = children > adults ? spotsUsed : spotsUsed + 1;
    if (newSpotsUsed > maxParticipants) return;
    setAdults(adults + 1);
  };
  const handleChildrenDecrease = () => {
    if (children > 0) setChildren(children - 1);
  };
  const handleChildrenIncrease = () => {
    if (children >= adults) return;
    setChildren(children + 1);
  };

  return (
    <div className="flex flex-col items-center py-4">
      <p className="text-sm text-[#464646]/70 mb-4">כמה משתתפים יהיו בסדנה?</p>

      {/* מבוגרים + ילדים בשורה אחת */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-4">
        {/* מבוגרים */}
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-4 h-4 text-[#581E83]" />
            <span className="text-sm font-medium text-[#581E83]">מבוגרים</span>
            <span className="text-[10px] text-[#464646]/50">(14+)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleAdultsDecrease}
              disabled={adults <= 1}
              className="w-8 h-8 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                         text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
            >
              <Minus className="w-3 h-3" />
            </button>
            <motion.div
              key={adults}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-[#581E83] w-9 text-center"
            >
              {adults}
            </motion.div>
            <button
              type="button"
              onClick={handleAdultsIncrease}
              disabled={spotsUsed >= maxParticipants && children <= adults}
              className="w-8 h-8 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                         text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ילדים */}
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Baby className="w-4 h-4 text-[#581E83]" />
            <span className="text-sm font-medium text-[#581E83]">ילדים</span>
            <span className="text-[10px] text-[#464646]/50">(8-13)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleChildrenDecrease}
              disabled={children <= 0}
              className="w-8 h-8 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                         text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
            >
              <Minus className="w-3 h-3" />
            </button>
            <motion.div
              key={children}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-[#581E83] w-9 text-center"
            >
              {children}
            </motion.div>
            <button
              type="button"
              onClick={handleChildrenIncrease}
              disabled={children >= adults}
              className="w-8 h-8 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                         text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#5E2F88]"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* הסבר על הורה+ילד */}
      {children > 0 && (
        <div className="w-full max-w-md mb-3 rounded-lg border border-[#5E2F88]/20 bg-[#5E2F88]/5 p-2.5">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#5E2F88] mt-0.5 shrink-0" />
            <div className="text-[11px] text-[#464646]/80">
              <span className="font-medium text-[#581E83]">הורה + ילד = שטיח אחד.</span> ילד מצטרף להורה ולא תופס מקום נוסף.
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isGroupTooLarge ? (
          <motion.div
            key="large-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 flex flex-col items-center gap-2 text-center"
          >
            <p className="text-sm text-[#464646]/80 max-w-[280px]">
              לקבוצות מעל 9 משתתפים יש לנו הצעות מיוחדות!
            </p>
            <a
              href="https://wa.link/jbfarf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2 text-sm text-white font-medium hover:bg-[#20bd5a] transition-colors"
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
            className="mt-2 text-center"
          >
            <div className="text-xs text-[#464646]/70">
              {soloAdults > 0 && <span>{soloAdults} {soloAdults === 1 ? 'מבוגר' : 'מבוגרים'}</span>}
              {parentChildPairs > 0 && soloAdults > 0 && <span> + </span>}
              {parentChildPairs > 0 && <span>{parentChildPairs} {parentChildPairs === 1 ? 'זוג' : 'זוגות'} הורה+ילד</span>}
            </div>
            {totalPrice > 0 && (
              <p className="text-base font-semibold text-[#5E2F88] mt-1">
                ₪{totalPrice} לסדנה
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isGroupTooLarge && totalParticipants >= 5 && (
        <div className="mt-2">
          <a
            href="https://wa.link/jbfarf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#5E2F88] underline hover:no-underline"
          >
            אנחנו קבוצה גדולה - מעל ל 9 משתתפים
          </a>
        </div>
      )}

      {!isGroupTooLarge && (
        <Button
          onClick={onContinue}
          className="mt-5 bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-2.5 rounded-lg text-base"
        >
          המשך לבחירת גודל שטיח
        </Button>
      )}
    </div>
  );
}
