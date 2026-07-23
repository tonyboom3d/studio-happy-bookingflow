import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Users, Baby, MessageCircle, AlertTriangle, Flame, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { getSlotLocalDate, getSlotTimeRange } from '@/lib/slotTime';

// Candles workshop ("סדנת נרות") participants step.
// Minimum age is 4. Every child (ages 4-10) books as its own parent+child
// ticket (one candle per child), and a single adult can accompany up to
// MAX_CHILDREN_PER_ADULT children. Adults not accompanying children get a
// solo ticket (one candle each).
const MAX_CHILDREN_PER_ADULT = 4;
export default function CandelsParticipantsSection({
  adults,
  setAdults,
  children,
  setChildren,
  maxParticipants = 10,
  servicePricing,
  selectedSlot,
  onContinue
}) {
  const [validationError, setValidationError] = useState(null);

  // כל ילד = כרטיס הורה+ילד (נר אחד); מבוגר מלווה עד 4 ילדים
  const accompanyingAdults = Math.min(adults, Math.ceil(children / MAX_CHILDREN_PER_ADULT));
  const parentChildPairs = children;
  const soloAdults = adults - accompanyingAdults;
  const totalCandles = soloAdults + children; // נר לכל כרטיס (יחיד או הורה+ילד)
  // מקומות תפוסים: כרטיס יחיד = 1, כרטיס הורה+ילד = 1
  const spotsUsed = totalCandles;
  const totalParticipants = adults + children;
  const isGroupTooLarge = totalParticipants > 9;

  // ילדים בלי מספיק מבוגרים מלווים (מבוגר אחד עד 4 ילדים)
  const childrenNeedAdult = children > adults * MAX_CHILDREN_PER_ADULT;
  const missingAdults = childrenNeedAdult ? Math.ceil(children / MAX_CHILDREN_PER_ADULT) - adults : 0;

  // חריגה מהמקומות הפנויים
  const spotsExceeded = spotsUsed > maxParticipants;

  const selectedSlotInfo = useMemo(() => {
    if (!selectedSlot?.start?.timestamp) return null;
    const ld = getSlotLocalDate(selectedSlot);
    if (!ld) return null;
    const date = new Date(ld.year, ld.monthOfYear - 1, ld.dayOfMonth);
    return {
      dateLabel: format(date, 'EEEE, d בMMMM', { locale: he }),
      timeRange: getSlotTimeRange(selectedSlot),
    };
  }, [selectedSlot]);

  const slotPricing = useMemo(() => {
    if (!selectedSlot?.serviceId || !servicePricing) return null;
    const pricing = servicePricing[selectedSlot.serviceId];
    if (!pricing) return null;
    const solo = pricing.solo || 0;
    return {
      solo,
      parentChild: pricing.parentChild || solo,
    };
  }, [selectedSlot, servicePricing]);

  const { totalPrice, soloUnitPrice, parentChildUnitPrice } = useMemo(() => {
    if (!slotPricing) return { totalPrice: 0, soloUnitPrice: 0, parentChildUnitPrice: 0 };

    const pricePerAdult = slotPricing.solo;
    const parentChildTicketPrice = slotPricing.parentChild;

    return {
      soloUnitPrice: pricePerAdult,
      parentChildUnitPrice: parentChildTicketPrice,
      totalPrice: (soloAdults * pricePerAdult) + (parentChildPairs * parentChildTicketPrice),
    };
  }, [slotPricing, soloAdults, parentChildPairs]);

  const handleAdultsDecrease = () => {
    if (adults > 1) {
      setAdults(adults - 1);
      setValidationError(null);
    }
  };
  const handleAdultsIncrease = () => {
    setAdults(adults + 1);
    setValidationError(null);
  };
  const handleChildrenDecrease = () => {
    if (children > 0) {
      setChildren(children - 1);
      setValidationError(null);
    }
  };
  const handleChildrenIncrease = () => {
    setChildren(children + 1);
    setValidationError(null);
  };

  const handleContinue = () => {
    if (childrenNeedAdult) {
      setValidationError(`יש להוסיף ${missingAdults} ${missingAdults === 1 ? 'מבוגר מלווה' : 'מבוגרים מלווים'} — כל מבוגר יכול ללוות עד ${MAX_CHILDREN_PER_ADULT} ילדים בגילאי 4-10 (כרטיס הורה + ילד לכל ילד)`);
      return;
    }
    if (spotsExceeded) {
      setValidationError(`נותרו ${maxParticipants} מקומות בלבד בתאריך שנבחר`);
      return;
    }
    setValidationError(null);
    onContinue();
  };

  return (
    <div className="flex flex-col items-center py-4">
      <p className="text-[16px] text-[#464646]/70 mb-1">כמה משתתפים יהיו בסדנה?</p>
      <p className="text-[13px] text-[#464646]/50 mb-4">גיל מינימלי להשתתפות בסדנה: 4</p>

      {selectedSlotInfo && slotPricing && (
        <div className="w-full max-w-md rounded-xl border border-[#5E2F88]/15 bg-[#5E2F88]/5 p-3 mb-4">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-[#5E2F88]/80 mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {selectedSlotInfo.dateLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {selectedSlotInfo.timeRange}
            </span>
          </div>
          <div className="space-y-1.5 text-[15px]">
            <div className="flex justify-between gap-3">
              <span className="text-[#464646]/80">כרטיס יחיד</span>
              <span className="font-semibold text-[#581E83] tabular-nums">₪{slotPricing.solo}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#464646]/80">הורה + ילד</span>
              <span className="font-semibold text-[#581E83] tabular-nums">₪{slotPricing.parentChild}</span>
            </div>
          </div>
        </div>
      )}

      {/* מבוגרים + ילדים בשורה אחת */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-2">
        {/* מבוגרים */}
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-3">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Users className="w-5 h-5 text-[#581E83]" />
            <span className="text-[20px] font-medium text-[#581E83]">מבוגרים</span>
            {/* <span className="text-[16px] text-[#464646]/50">(7+)</span> */} 
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
              className="w-8 h-8 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                         text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ילדים */}
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-3">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Baby className="w-5 h-5 text-[#581E83]" />
            <span className="text-[20px] font-medium text-[#581E83]">ילדים</span>
            <span className="text-[16px] text-[#464646]/50">(4-10)</span>
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
              className="w-8 h-8 rounded-full border-2 border-[#5E2F88] flex items-center justify-center
                         text-[#5E2F88] hover:bg-[#5E2F88] hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* סיכום ויזואלי עם אייקונים — סדר: מבוגר | נר | ילד */}
      {!isGroupTooLarge && (
        <div className="w-full max-w-md rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3 mb-3">
          <div className="flex items-start justify-around text-center">
            {/* מבוגרים */}
            <div className="flex flex-col items-center gap-1">
              <Users className="w-5 h-5 text-[#581E83]" />
              <span className="text-[20px] font-bold text-[#581E83]">{adults}</span>
              <span className="text-[16px] text-[#464646]/60">{adults === 1 ? 'מבוגר' : 'מבוגרים'}</span>
            </div>

            {/* נרות — באמצע עם הסבר מתחת */}
            <div className="flex flex-col items-center gap-1">
              <Flame className="w-5 h-5 text-[#581E83]" />
              <span className="text-[20px] font-bold text-[#581E83]">{totalCandles}</span>
              <span className="text-[16px] text-[#464646]/60">{totalCandles === 1 ? 'נר' : 'נרות'}</span>
              {children > 0 && (
                <span className="text-[14px] text-[#5E2F88]/70 mt-0.5 leading-tight">
                  כל ילד = כרטיס הורה + ילד (נר אחד)
                </span>
              )}
            </div>

            {/* ילדים */}
            <div className="flex flex-col items-center gap-1">
              <Baby className="w-5 h-5 text-[#581E83]" />
              <span className="text-[20px] font-bold text-[#581E83]">{children}</span>
              <span className="text-[16px] text-[#464646]/60">{children === 1 ? 'ילד' : 'ילדים'}</span>
            </div>

            {/* קו מפריד */}
            {totalPrice > 0 && <div className="h-12 w-px bg-[#e8e8e8]" />}

            {/* מחיר */}
            {totalPrice > 0 && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[16px] text-[#464646]/60">סה״כ</span>
                <span className="text-[20px] font-bold text-[#5E2F88]">₪{totalPrice}</span>
                <span className="text-[16px] text-[#464646]/60">לסדנה</span>
              </div>
            )}
          </div>

          {totalPrice > 0 && (soloAdults > 0 || parentChildPairs > 0) && (
            <div className="mt-3 pt-3 border-t border-[#e8e8e8] space-y-1.5 text-[14px] text-[#464646]">
              {soloAdults > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {soloAdults} × כרטיס יחיד
                  </span>
                  <span className="font-medium tabular-nums">₪{soloAdults * soloUnitPrice}</span>
                </div>
              )}
              {parentChildPairs > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <Baby className="w-3.5 h-3.5" />
                    {parentChildPairs} × הורה + ילד
                  </span>
                  <span className="font-medium tabular-nums">₪{parentChildPairs * parentChildUnitPrice}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* שגיאת חריגה מהמקומות הפנויים */}
      {spotsExceeded && (
        <div className="w-full max-w-md mb-3 rounded-lg border border-red-300 bg-red-50 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="text-xs text-red-700">
              <p className="font-medium mb-1">אין מספיק מקומות בתאריך שנבחר</p>
              <p>נותרו {maxParticipants} מקומות בלבד. הפחיתו משתתפים, בחרו תאריך אחר, או{' '}
                <a href="https://wa.link/jbfarf" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  צרו קשר בוואטסאפ
                </a> לבירור.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* כפתור המשך + שגיאת ולידציה */}
      {!isGroupTooLarge && (
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleContinue}
            className="bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-2.5 rounded-lg text-base"
          >
          המשך לשלב הבא
          </Button>

          <AnimatePresence>
            {validationError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xs text-red-600 text-center max-w-[300px]"
              >
                {validationError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* לינק לקבוצות גדולות — מתחת לכפתור */}
      {!isGroupTooLarge && totalParticipants >= 5 && (
        <div className="mt-3">
          <a
            href="https://wa.link/jbfarf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#5E2F88] underline hover:no-underline"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
            <span>אנחנו קבוצה גדולה - מעל ל 9 משתתפים</span>
          </a>
        </div>
      )}

      {/* קבוצה גדולה מעל 9 */}
      {isGroupTooLarge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex flex-col items-center gap-2 text-center"
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
      )}
    </div>
  );
}
