import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, Info, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isBefore,
  startOfDay,
  max,
  min,
  compareAsc,
  addMonths,
  subMonths
} from 'date-fns';
import { he } from 'date-fns/locale';
import { toast, dismissToast } from '@/components/ui/use-toast';

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

/** גבולות תאריך למשבצת ריקה: אחרי כל המפגשים לפניה, לפני כל המפגשים אחריה (סדר עולה מלא) */
function getStrictChronoBounds(selectedDates, slotIndex, totalMeetings) {
  if (slotIndex < 0 || slotIndex >= totalMeetings) return { lower: null, upper: null };
  const prior = [];
  for (let j = 0; j < slotIndex; j++) {
    if (selectedDates[j]) prior.push(startOfDay(selectedDates[j]));
  }
  const later = [];
  for (let j = slotIndex + 1; j < totalMeetings; j++) {
    if (selectedDates[j]) later.push(startOfDay(selectedDates[j]));
  }
  return {
    lower: prior.length ? max(prior) : null,
    upper: later.length ? min(later) : null
  };
}

function isDateValidForStrictChrono(date, bounds) {
  if (!bounds) return true;
  const { lower, upper } = bounds;
  const d = startOfDay(date);
  if (lower && compareAsc(d, lower) <= 0) return false;
  if (upper && compareAsc(d, upper) >= 0) return false;
  return true;
}

/** טיימר להודעת לוח שנה — הודעה אחת בלבד, נסגרת אוטומטית אחרי מספר שניות */
let calendarToastHideTimer = null;

function showToastForSeconds(description, seconds = 4) {
  if (calendarToastHideTimer != null) {
    clearTimeout(calendarToastHideTimer);
    calendarToastHideTimer = null;
  }
  dismissToast();
  const handle = toast({ description });
  calendarToastHideTimer = window.setTimeout(() => {
    calendarToastHideTimer = null;
    handle.dismiss();
  }, seconds * 1000);
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

  const [today] = useState(() => startOfDay(new Date()));

  // מידע על זמינות תאריכים לפי מה שה-API מחזיר
  // availableDates = ימים עם מספיק מקומות, partialDates = ימים עם slots אבל לא מספיק מקומות
  // sessionMap = מיפוי תאריך ל-slot עם sessionId
  const { availableDates: availableDatesSet, partialDates, spotsMap, sessionMap } = useMemo(
    () => getAvailabilityInfo(Array.isArray(availableSlots) ? availableSlots : [], participants),
    [availableSlots, participants]
  );

  const selectedMeetingsCount = useMemo(
    () => selectedDates.filter(Boolean).length,
    [selectedDates]
  );

  const missingSessionIdCount = useMemo(() => {
    const filled = selectedDates.filter(Boolean);
    if (filled.length !== totalMeetings) return 0;
    let missing = 0;
    for (const date of filled) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const wixSlot = sessionMap.get(dateStr);
      const sessionId = wixSlot?.sessionId || wixSlot?._id || null;
      if (!sessionId) missing += 1;
    }
    return missing;
  }, [selectedDates, totalMeetings, sessionMap]);

  // יצירת משבצות למפגשים
  const slots = Array.from({ length: totalMeetings }, (_, i) => ({
    index: i,
    date: selectedDates[i] || null
  }));

  const handleDateSelect = useCallback(
    (date) => {
      if (isBefore(startOfDay(date), today)) return;
      const dateStr = format(startOfDay(date), 'yyyy-MM-dd');

      const baseDates = Array.from({ length: totalMeetings }, (_, i) => selectedDates[i] ?? null);

      const existingIndex = baseDates.findIndex((d) => d && isSameDay(d, date));
      if (existingIndex !== -1) {
        const newDates = [...baseDates];
        newDates[existingIndex] = null;
        setSelectedDates(newDates);
        const firstEmpty = newDates.findIndex((d) => !d);
        setCurrentSlotIndex(firstEmpty >= 0 ? firstEmpty : 0);
        return;
      }

      const firstEmptyIndex = baseDates.findIndex((d) => !d);
      if (firstEmptyIndex === -1) return;

      const chronoBounds = getStrictChronoBounds(baseDates, firstEmptyIndex, totalMeetings);
      if (!isDateValidForStrictChrono(date, chronoBounds)) {
        if (chronoBounds.lower && compareAsc(startOfDay(date), chronoBounds.lower) <= 0) {
          showToastForSeconds('יש לבחור תאריך אחרי המפגשים הקודמים (סדר עולה)');
        } else {
          showToastForSeconds('יש לבחור תאריך לפני המפגשים הבאים (סדר עולה)');
        }
        return;
      }

      if (!availableDatesSet.has(dateStr)) {
        if (partialDates.has(dateStr)) {
          const places = spotsMap.get(dateStr) ?? 0;
          showToastForSeconds(`סדנה כמעט מלאה, נשארו ${places} מקומות`);
        }
        return;
      }

      const newDates = [...baseDates];
      newDates[firstEmptyIndex] = date;
      setSelectedDates(newDates);

      const nextEmpty = newDates.findIndex((d, i) => i > firstEmptyIndex && !d);
      const fallbackEmpty = newDates.findIndex((d) => !d);
      setCurrentSlotIndex(
        nextEmpty !== -1 ? nextEmpty : fallbackEmpty >= 0 ? fallbackEmpty : totalMeetings - 1
      );
    },
    [
      today,
      totalMeetings,
      selectedDates,
      availableDatesSet,
      partialDates,
      spotsMap
    ]
  );

  const firstEmptyIndexLive = useMemo(() => selectedDates.findIndex((d) => !d), [selectedDates]);

  const strictChronoBounds = useMemo(() => {
    if (firstEmptyIndexLive < 0) return { lower: null, upper: null };
    return getStrictChronoBounds(selectedDates, firstEmptyIndexLive, totalMeetings);
  }, [selectedDates, firstEmptyIndexLive, totalMeetings]);

  const handleCalendarDayClick = useCallback(
    (day) => {
      const sod = startOfDay(day);
      if (isBefore(sod, today)) return;
      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
      if (!isCurrentMonth) return;

      const dateStr = format(sod, 'yyyy-MM-dd');
      const hasEnoughSlots = availableDatesSet.has(dateStr);
      const hasPartialSlots = partialDates.has(dateStr);
      const isNoSession = !hasEnoughSlots && !hasPartialSlots;
      const isNotEnoughSpots = hasPartialSlots && !hasEnoughSlots;

      const alreadySelected = selectedDates.some((d) => d && isSameDay(d, day));

      if (
        !alreadySelected &&
        firstEmptyIndexLive >= 0 &&
        !isDateValidForStrictChrono(day, strictChronoBounds)
      ) {
        if (strictChronoBounds.lower && compareAsc(sod, strictChronoBounds.lower) <= 0) {
          showToastForSeconds('יש לבחור תאריך אחרי המפגשים הקודמים (סדר עולה)');
        } else {
          showToastForSeconds('יש לבחור תאריך לפני המפגשים הבאים (סדר עולה)');
        }
        return;
      }

      if (isNoSession) return;

      if (!alreadySelected && isNotEnoughSpots) {
        const places = spotsMap.get(dateStr) ?? 0;
        showToastForSeconds(`סדנה כמעט מלאה, נשארו ${places} מקומות`);
        return;
      }

      if (hasEnoughSlots || alreadySelected) {
        handleDateSelect(day);
      }
    },
    [
      today,
      currentMonth,
      availableDatesSet,
      partialDates,
      spotsMap,
      selectedDates,
      firstEmptyIndexLive,
      strictChronoBounds,
      handleDateSelect
    ]
  );

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
    <div className="py-4" dir="rtl">
      {/* כותרת - רק תאריכים עם זמינות ב-API ניתנים לבחירה */}
      <div className="mb-2 flex items-center justify-end gap-2 text-right md:justify-center" data-calendar-version="slots-only">
        <Calendar className="h-4 w-4 shrink-0 text-[#6B584C] md:h-5 md:w-5" />
        <span className="text-base font-medium text-[#6B584C] md:text-lg">
          בחרו {totalMeetings} תאריכי מפגש
        </span>
      </div>

      {/* הערה חשובה */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 md:mb-4 md:p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 md:h-4 md:w-4" />
        <div className="min-w-0 text-right text-xs text-blue-900 md:text-sm">
          <p className="text-[11px] leading-snug text-blue-700 md:text-xs">לחצו על התאריכים הרצויים בלוח השנה • ניתן לשנות 48 שעות לפני</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* משבצות מפגשים */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-[#6B584C] md:mb-3">המפגשים שלי:</h3>
          <div className="flex flex-col gap-1.5 md:grid md:grid-cols-2 md:gap-2">
            {slots.map((slot, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSlotClick(index)}
                className={cn(
                  'relative rounded-xl border-2 text-right',
                  'min-h-[3.25rem] p-2.5 max-md:flex max-md:items-center max-md:justify-between max-md:gap-2 max-md:pl-8',
                  'md:min-h-0 md:p-4 md:block',
                  currentSlotIndex === index
                    ? 'border-[#ADC178] bg-[#ADC178]/10 shadow-md'
                    : slot.date
                      ? 'border-[#ADC178]/50 bg-white'
                      : 'border-[#e8e8e8] bg-[#fafafa]'
                )}
              >
                {slot.date ? (
                  <>
                    <div className="min-w-0 flex-1 md:block">
                      <div className="text-[10px] leading-tight text-[#464646]/70 md:mb-1 md:text-xs">מפגש {index + 1}</div>
                      <div className="flex flex-wrap items-baseline max-md:justify-start md:justify-end gap-x-1.5 md:flex-col md:items-stretch md:gap-0">
                        <span className="text-sm font-semibold text-[#6B584C] md:font-medium">
                          {format(slot.date, 'd/M/yy', { locale: he })}
                        </span>
                        <span className="text-[10px] leading-tight text-[#464646]/70 md:text-xs md:mt-0.5">
                          {format(slot.date, 'EEEE', { locale: he })}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDate(index);
                      }}
                      className="absolute left-2 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors hover:bg-red-200 md:left-2 md:top-2 md:h-5 md:w-5 md:translate-y-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-full text-right">
                      <div className="text-[10px] text-[#464646]/70 md:text-xs md:mb-1">מפגש {index + 1}</div>
                      <div className="text-xs text-[#464646]/50 md:text-sm">לחץ לבחירה</div>
                    </div>
                    {currentSlotIndex === index && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ADC178] md:-right-1 md:-top-1 md:h-3 md:w-3"
                      />
                    )}
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="mt-2 rounded-lg bg-[#fafafa] p-1.5 text-center md:mt-3 md:p-2">
            <span className="text-xs text-[#464646] md:text-sm">
              נבחרו {selectedDates.filter(Boolean).length} מתוך {totalMeetings}
            </span>
            {selectedDates.filter(Boolean).length === totalMeetings && (
              <span className="text-sm text-[#ADC178] font-medium mr-2">✓</span>
            )}
          </div>
        </div>

        {/* לוח שנה */}
        <div>
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-3 md:p-4">
            {/* כותרת חודש */}
            <div className="mb-3 flex items-center justify-between md:mb-4">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-lg p-2 transition-colors hover:bg-[#fafafa]"
              >
                →
              </button>
              <h3 className="font-medium text-[#6B584C]">
                {format(currentMonth, 'MMMM yyyy', { locale: he })}
              </h3>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-lg p-2 transition-colors hover:bg-[#fafafa]"
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
                const sod = startOfDay(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isPast = isBefore(sod, today);
                const dateStr = format(sod, 'yyyy-MM-dd');
                const hasEnoughSlots = availableDatesSet.has(dateStr);
                const hasPartialSlots = partialDates.has(dateStr);
                const isNoSession = !hasEnoughSlots && !hasPartialSlots;
                const isNotEnoughSpots = hasPartialSlots && !hasEnoughSlots;
                const isSelected = isDateSelected(day);
                const selectionNumber = getDateSelectionNumber(day);

                const alreadySelected = selectedDates.some((d) => d && isSameDay(d, day));
                const hasWorkshopDay = hasEnoughSlots || hasPartialSlots;
                const chronoBlocked =
                  !isPast &&
                  !alreadySelected &&
                  firstEmptyIndexLive >= 0 &&
                  !isDateValidForStrictChrono(sod, strictChronoBounds);
                /** כרונולוגיה רק כשיש סדנה — בלי סדנה נשאר עיצוב "אין סדנה" (מספר בהיר בלבד) */
                const showChronoBlockVisual =
                  chronoBlocked && hasWorkshopDay && isCurrentMonth && !isSelected;

                const isUnavailableNoData = (isPast || isNoSession) && !isSelected;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleCalendarDayClick(day)}
                    className={cn(
                      'relative aspect-square overflow-visible rounded-lg text-sm font-medium',
                      !isCurrentMonth && 'pointer-events-none text-[#464646]/25',
                      isUnavailableNoData &&
                        isCurrentMonth &&
                        'cursor-default bg-transparent text-[#c4c4c4] shadow-none',
                      isCurrentMonth &&
                        isNotEnoughSpots &&
                        !isSelected &&
                        !showChronoBlockVisual &&
                        'cursor-pointer border border-orange-400 bg-orange-100 text-orange-800 hover:bg-orange-200/90',
                      isCurrentMonth &&
                        hasEnoughSlots &&
                        !isSelected &&
                        !chronoBlocked &&
                        'cursor-pointer text-[#6B584C] hover:bg-[#ADC178]/20',
                      isSelected && 'z-10 cursor-pointer bg-[#ADC178] text-white shadow-md',
                      showChronoBlockVisual &&
                        'cursor-pointer bg-neutral-300 text-neutral-800 hover:bg-neutral-300'
                    )}
                  >
                    {showChronoBlockVisual && (
                      <span
                        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg opacity-35"
                        style={{
                          background:
                            'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.35) 3px, rgba(0,0,0,0.35) 4px)'
                        }}
                        aria-hidden
                      />
                    )}
                    <span className="relative z-[1]">{format(day, 'd')}</span>
                    {isSelected && selectionNumber && (
                      <div className="absolute left-1/2 top-0 z-[25] flex min-w-[2.6rem] -translate-x-1/2 -translate-y-[45%] items-center justify-center gap-0.5 whitespace-nowrap rounded-full bg-[#6B584C] px-1.5 py-0.5 text-[8px] font-medium text-white shadow-md ring-1 ring-white/60">
                        <span className="leading-none">מפגש</span>
                        <span className="tabular-nums leading-none">{selectionNumber}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* כפתור המשך לתשלום */}
      <div className="flex flex-col items-center mt-6 gap-3">
        <button
          type="button"
          onClick={() => {
            if (selectedMeetingsCount !== totalMeetings) {
              showToastForSeconds('יש לבחור תאריך לכל מפגש לפני שממשיכים');
              return;
            }

            if (missingSessionIdCount > 0) {
              showToastForSeconds('יש לבחור תאריכים זמינים — חסרה התאמה למפגש באחד התאריכים');
              return;
            }

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
          disabled={
            selectedMeetingsCount !== totalMeetings ||
            missingSessionIdCount > 0 ||
            isSubmitting
          }
          className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg text-lg disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5" />
              מעבר למילוי פרטים אישיים...
            </>
          ) : (
            continueLabel || 'המשך לפרטים אישיים'
          )}
        </button>
        {missingSessionIdCount > 0 && (
          <p className="text-sm text-red-600 text-center max-w-[28rem]">
            נראה שנבחר תאריך שאין לו מפגש זמין. נסו לבחור תאריך אחר.
          </p>
        )}
        {isSubmitting && (
          <p className="text-sm text-[#6B584C]/70">
            אנחנו מכינים עבורך הזמנה — תועבר בשניות
          </p>
        )}
      </div>
    </div>
  );
}