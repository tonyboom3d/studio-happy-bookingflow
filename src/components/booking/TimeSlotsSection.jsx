import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Info, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isBefore, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

// מחזיר מידע על תאריכים זמינים
// availableDates: Set של תאריכים עם מספיק מקומות (openSpots >= requiredSpots)
// partialDates: Set של תאריכים עם slots אבל לא מספיק מקומות
// spotsMap: Map של תאריך למספר מקומות פנויים מקסימלי
// sessionMap: Map של תאריך ל-sessionId (חשוב עבור ביצוע ההזמנה!)
function getAvailabilityInfo(availableSlots, requiredSpots = 1) {
  const availableDates = new Set();
  const partialDates = new Set();
  const spotsMap = new Map();
  const sessionMap = new Map(); // תאריך -> slot מלא עם sessionId

  if (!Array.isArray(availableSlots)) {
    return { availableDates, partialDates, spotsMap, sessionMap };
  }

  availableSlots.forEach((slot) => {
    const openSpots = slot?.openSpots ?? slot?.remainingSpots ?? 0;
    const start = slot?.start;
    if (!start) return;

    let dateStr;
    if (start.localDateTime) {
      const { year, monthOfYear, dayOfMonth } = start.localDateTime;
      dateStr = `${year}-${String(monthOfYear).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    } else if (start.timestamp) {
      dateStr = format(new Date(start.timestamp), 'yyyy-MM-dd');
    } else {
      return;
    }

    // שמירת מספר המקומות הפנויים המקסימלי לתאריך
    const currentMax = spotsMap.get(dateStr) || 0;
    if (openSpots > currentMax) {
      spotsMap.set(dateStr, openSpots);
    }

    // שמירת ה-slot המלא עם ה-sessionId (מעדיפים slot עם מספיק מקומות)
    if (openSpots >= requiredSpots) {
      sessionMap.set(dateStr, slot);
    } else if (!sessionMap.has(dateStr)) {
      sessionMap.set(dateStr, slot);
    }

    // סיווג התאריך
    if (openSpots >= requiredSpots) {
      availableDates.add(dateStr);
      partialDates.delete(dateStr); // אם יש slot עם מספיק מקומות, זה לא partial
    } else if (openSpots > 0 && !availableDates.has(dateStr)) {
      partialDates.add(dateStr); // יש מקומות אבל לא מספיק
    }
  });

  return { availableDates, partialDates, spotsMap, sessionMap };
}

export default function TimeSlotsSection({
  selectedSlots,
  setSelectedSlots,
  totalMeetings,
  onContinue,
  continueLabel,
  isSubmitting = false,
  timerActive,
  setTimerActive,
  availableSlots = [],
  participants = 1
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // אתחול selectedDates מ-selectedSlots אם קיימים (שמירת הבחירה בעת מעבר בין שלבים)
  const [selectedDates, setSelectedDates] = useState(() => {
    if (selectedSlots && selectedSlots.length > 0) {
      // המרת selectedSlots חזרה לתאריכים
      return selectedSlots.map(slot => slot.date ? new Date(slot.date) : null);
    }
    return [];
  });
  const [currentSlotIndex, setCurrentSlotIndex] = useState(() => {
    // התחלה מהמפגש הריק הראשון
    if (selectedSlots && selectedSlots.length > 0) {
      const firstEmpty = selectedSlots.findIndex(slot => !slot.date);
      return firstEmpty >= 0 ? firstEmpty : selectedSlots.length;
    }
    return 0;
  });

  const today = startOfDay(new Date());

  // מידע על זמינות תאריכים לפי מה שה-API מחזיר
  // availableDates = ימים עם מספיק מקומות, partialDates = ימים עם slots אבל לא מספיק מקומות
  // sessionMap = מיפוי תאריך ל-slot עם sessionId
  const { availableDates: availableDatesSet, partialDates, spotsMap, sessionMap } = useMemo(
    () => getAvailabilityInfo(Array.isArray(availableSlots) ? availableSlots : [], participants),
    [availableSlots, participants]
  );

  // יצירת משבצות למפגשים
  const slots = Array.from({ length: totalMeetings }, (_, i) => ({
    index: i,
    date: selectedDates[i] || null
  }));

  const handleDateSelect = (date) => {
    if (isBefore(startOfDay(date), today)) return;
    const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
    if (!availableDatesSet.has(dateStr)) return;

    // מערך באורך totalMeetings (ממלאים null אם חסר)
    const baseDates = Array.from({ length: totalMeetings }, (_, i) => selectedDates[i] ?? null);

    // אם התאריך כבר נבחר – מסירים אותו
    const existingIndex = baseDates.findIndex(d => d && isSameDay(d, date));
    if (existingIndex !== -1) {
      const newDates = [...baseDates];
      newDates[existingIndex] = null;
      setSelectedDates(newDates);
      const firstEmpty = newDates.findIndex(d => !d);
      setCurrentSlotIndex(firstEmpty >= 0 ? firstEmpty : 0);
      return;
    }

    // תמיד ממלאים את המפגש הריק הראשון – המשתמש רק לוחץ על תאריכים ברצף
    const firstEmptyIndex = baseDates.findIndex(d => !d);
    if (firstEmptyIndex === -1) return;

    const newDates = [...baseDates];
    newDates[firstEmptyIndex] = date;
    setSelectedDates(newDates);

    // מעבר אוטומטי להדגשת המפגש הריק הבא (כדי שהלחיצה הבאה תלך אליו)
    const nextEmpty = newDates.findIndex((d, i) => i > firstEmptyIndex && !d);
    const fallbackEmpty = newDates.findIndex(d => !d);
    setCurrentSlotIndex(nextEmpty !== -1 ? nextEmpty : (fallbackEmpty >= 0 ? fallbackEmpty : totalMeetings - 1));
  };

  const handleSlotClick = (index) => {
    setCurrentSlotIndex(index);
  };

  const removeDate = (index) => {
    const newDates = [...selectedDates];
    newDates[index] = null;
    setSelectedDates(newDates);
    setCurrentSlotIndex(index);
  };

  // יצירת ימים בחודש
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isDateSelected = (date) => {
    return selectedDates.some(d => d && isSameDay(d, date));
  };

  const getDateSelectionNumber = (date) => {
    const index = selectedDates.findIndex(d => d && isSameDay(d, date));
    return index !== -1 ? index + 1 : null;
  };

  return (
    <div className="py-4">
      {/* כותרת - רק תאריכים עם זמינות ב-API ניתנים לבחירה */}
      <div className="flex items-center justify-center gap-2 mb-2" data-calendar-version="slots-only">
        <Calendar className="w-5 h-5 text-[#6B584C]" />
        <span className="text-lg font-medium text-[#6B584C]">
          בחרו {totalMeetings} תאריכי מפגש
        </span>
      </div>

      {/* הערה חשובה */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="text-xs text-blue-700">לחצו על התאריכים הרצויים בלוח השנה • ניתן לשנות 48 שעות לפני באזור האישי</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* משבצות מפגשים */}
        <div>
          <h3 className="text-sm font-medium text-[#6B584C] mb-3">המפגשים שלי:</h3>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot, index) => (
              <motion.button
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSlotClick(index)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200 relative",
                  currentSlotIndex === index
                    ? "border-[#ADC178] bg-[#ADC178]/10 shadow-md"
                    : slot.date
                      ? "border-[#ADC178]/50 bg-white"
                      : "border-[#e8e8e8] bg-[#fafafa]"
                )}
              >
                <div className="text-xs text-[#464646]/70 mb-1">מפגש {index + 1}</div>
                {slot.date ? (
                  <>
                    <div className="text-sm font-medium text-[#6B584C]">
                      {format(slot.date, 'd/M/yy', { locale: he })}
                    </div>
                    <div className="text-xs text-[#464646]/70 mt-0.5">
                      {format(slot.date, 'EEEE', { locale: he })}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDate(index);
                      }}
                      className="absolute top-2 left-2 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-[#464646]/50">לחץ לבחירה</div>
                )}
                {currentSlotIndex === index && !slot.date && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#ADC178]"
                  />
                )}
              </motion.button>
            ))}
          </div>

          <div className="mt-3 p-2 bg-[#fafafa] rounded-lg text-center">
            <span className="text-sm text-[#464646]">
              נבחרו {selectedDates.filter(Boolean).length} מתוך {totalMeetings}
            </span>
            {selectedDates.filter(Boolean).length === totalMeetings && (
              <span className="text-sm text-[#ADC178] font-medium mr-2">✓</span>
            )}
          </div>
        </div>

        {/* לוח שנה */}
        <div>
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-4">
            {/* כותרת חודש */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                className="p-2 hover:bg-[#fafafa] rounded-lg transition-colors"
              >
                →
              </button>
              <h3 className="font-medium text-[#6B584C]">
                {format(currentMonth, 'MMMM yyyy', { locale: he })}
              </h3>
              <button
                onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                className="p-2 hover:bg-[#fafafa] rounded-lg transition-colors"
              >
                ←
              </button>
            </div>

            {/* ימי השבוע */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-[#464646]/70 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* ימים - רק ימים שיש להם slot ב-API ניתנים לבחירה */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isPast = isBefore(startOfDay(day), today);
                const dateStr = format(startOfDay(day), 'yyyy-MM-dd');
                const hasEnoughSlots = availableDatesSet.has(dateStr);
                const hasPartialSlots = partialDates.has(dateStr); // יש מקומות אבל לא מספיק
                const isDisabled = isPast || (!hasEnoughSlots && !hasPartialSlots);
                const isNotEnoughSpots = hasPartialSlots && !hasEnoughSlots; // יש slots אבל לא מספיק מקומות
                const isSelected = isDateSelected(day);
                const selectionNumber = getDateSelectionNumber(day);

                return (
                  <motion.button
                    key={i}
                    whileTap={(isDisabled || isNotEnoughSpots) ? undefined : { scale: 0.9 }}
                    onClick={() => handleDateSelect(day)}
                    disabled={isDisabled || isNotEnoughSpots}
                    title={isNotEnoughSpots ? `נשארו רק ${spotsMap.get(dateStr)} מקומות` : undefined}
                    className={cn(
                      "aspect-square rounded-lg text-sm font-medium transition-all duration-200 relative",
                      !isCurrentMonth && "text-[#464646]/30",
                      // תאריך ללא slots בכלל או שעבר - אפור
                      isDisabled && "cursor-not-allowed opacity-50 bg-[#e8e8e8] text-[#999] hover:bg-[#e8e8e8] hover:opacity-50 pointer-events-none",
                      // תאריך עם slots אבל לא מספיק מקומות - כתום/אדום בהיר
                      isNotEnoughSpots && !isDisabled && "cursor-not-allowed bg-orange-100 text-orange-600 border border-orange-300 opacity-70",
                      // תאריך זמין ולא נבחר
                      !isDisabled && !isNotEnoughSpots && !isSelected && isCurrentMonth && "hover:bg-[#ADC178]/20 text-[#6B584C]",
                      // תאריך נבחר
                      isSelected && "bg-[#ADC178] text-white shadow-md"
                    )}
                  >
                    {format(day, 'd')}
                    {isSelected && selectionNumber && (
                      <div className="absolute top-0 right-0 z-20 min-w-[2rem] px-1.5 py-0.5 rounded-full bg-[#6B584C] text-white text-[8px] font-medium flex items-center justify-center whitespace-nowrap shadow-sm translate-x-1/2 -translate-y-1/2">
                        מפגש {selectionNumber}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* כפתור המשך לתשלום */}
      <div className="flex flex-col items-center mt-6 gap-3">
        <Button
          onClick={() => {
            const slotsWithSession = selectedDates.filter(Boolean).map((date, i) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const wixSlot = sessionMap.get(dateStr);
              return {
                id: `slot-${i}`,
                date: date,
                time: '10:00',
                sessionId: wixSlot?.sessionId || wixSlot?._id || null
              };
            });
            console.log('[TimeSlotsSection] Saving slots with sessionId:', slotsWithSession);
            setSelectedSlots(slotsWithSession);
            onContinue();
          }}
          disabled={selectedDates.filter(Boolean).length !== totalMeetings || isSubmitting}
          className="bg-[#ADC178] hover:bg-[#9ab569] hover:scale-[1.02] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              מעבר למילוי פרטים אישיים...
            </>
          ) : (
            continueLabel || 'המשך לפרטים אישיים'
          )}
        </Button>
        {isSubmitting && (
          <p className="text-sm text-[#6B584C]/70 animate-pulse">
            אנחנו מכינים עבורך הזמנה — תועבר בשניות
          </p>
        )}
      </div>
    </div>
  );
}