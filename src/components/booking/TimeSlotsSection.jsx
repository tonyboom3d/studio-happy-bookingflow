import React, { useState, useMemo } from 'react';
import { MessageCircle, ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock, Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isBefore,
  startOfDay,
  addMonths,
  subMonths
} from 'date-fns';
import { he } from 'date-fns/locale';

// חגי ישראל 2024-2027
const ISRAELI_HOLIDAYS = {
  '2024-04-22': 'פסח', '2024-04-23': 'פסח', '2024-04-28': 'פסח', '2024-04-29': 'פסח',
  '2024-05-14': 'יום העצמאות', '2024-06-11': 'שבועות', '2024-06-12': 'שבועות',
  '2024-10-02': 'ראש השנה', '2024-10-03': 'ראש השנה', '2024-10-04': 'ראש השנה',
  '2024-10-11': 'יום כיפור', '2024-10-12': 'יום כיפור',
  '2024-10-16': 'סוכות', '2024-10-17': 'סוכות', '2024-10-23': 'שמחת תורה', '2024-10-24': 'שמחת תורה',
  '2024-12-25': 'חנוכה', '2024-12-26': 'חנוכה',
  '2025-03-13': 'פורים', '2025-03-14': 'פורים',
  '2025-04-12': 'פסח', '2025-04-13': 'פסח', '2025-04-18': 'פסח', '2025-04-19': 'פסח',
  '2025-05-01': 'יום העצמאות', '2025-06-01': 'שבועות', '2025-06-02': 'שבועות',
  '2025-09-22': 'ראש השנה', '2025-09-23': 'ראש השנה', '2025-09-24': 'ראש השנה',
  '2025-10-01': 'יום כיפור', '2025-10-02': 'יום כיפור',
  '2025-10-06': 'סוכות', '2025-10-07': 'סוכות', '2025-10-13': 'שמחת תורה', '2025-10-14': 'שמחת תורה',
  '2025-12-14': 'חנוכה', '2025-12-15': 'חנוכה',
  '2026-03-03': 'פורים', '2026-03-04': 'פורים',
  '2026-04-01': 'פסח', '2026-04-02': 'פסח', '2026-04-07': 'פסח', '2026-04-08': 'פסח',
  '2026-04-22': 'יום העצמאות', '2026-05-21': 'שבועות', '2026-05-22': 'שבועות',
  '2026-09-11': 'ראש השנה', '2026-09-12': 'ראש השנה', '2026-09-13': 'ראש השנה',
  '2026-09-20': 'יום כיפור', '2026-09-21': 'יום כיפור',
  '2026-09-25': 'סוכות', '2026-09-26': 'סוכות', '2026-10-02': 'שמחת תורה', '2026-10-03': 'שמחת תורה',
  '2026-12-04': 'חנוכה', '2026-12-05': 'חנוכה',
  '2027-03-22': 'פורים', '2027-03-23': 'פורים',
  '2027-04-21': 'פסח', '2027-04-22': 'פסח', '2027-04-27': 'פסח', '2027-04-28': 'פסח',
  '2027-05-11': 'יום העצמאות', '2027-06-10': 'שבועות', '2027-06-11': 'שבועות',
};

function getAvailabilityInfo(availableSlots) {
  const availableDates = new Set();
  const spotsMap = new Map();
  const slotsMap = new Map(); // מערך של slots לכל תאריך

  if (!Array.isArray(availableSlots)) {
    return { availableDates, spotsMap, slotsMap };
  }

  availableSlots.forEach((slot) => {
    const openSpots = slot?.openSpots ?? slot?.remainingSpots ?? 0;
    const start = slot?.start;
    if (!start || openSpots <= 0) return;

    let dateStr;
    if (start.localDateTime) {
      const { year, monthOfYear, dayOfMonth } = start.localDateTime;
      dateStr = `${year}-${String(monthOfYear).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    } else if (start.timestamp) {
      dateStr = format(new Date(start.timestamp), 'yyyy-MM-dd');
    } else {
      return;
    }

    // עדכון מקסימום מקומות ליום
    const currentMax = spotsMap.get(dateStr) || 0;
    if (openSpots > currentMax) {
      spotsMap.set(dateStr, openSpots);
    }

    // הוספת slot למערך של היום
    const daySlots = slotsMap.get(dateStr) || [];
    daySlots.push(slot);
    slotsMap.set(dateStr, daySlots);

    availableDates.add(dateStr);
  });

  return { availableDates, spotsMap, slotsMap };
}

function getMinPriceForDate(slots, pricingByService) {
  if (!slots?.length || !pricingByService) return null;
  let minPrice = Infinity;
  slots.forEach(slot => {
    const pricing = pricingByService[slot.serviceId];
    if (pricing?.[1] && pricing[1] < minPrice) {
      minPrice = pricing[1];
    }
  });
  return minPrice === Infinity ? null : minPrice;
}

function getSlotTime(slot) {
  const dt = slot?.start?.localDateTime;
  if (!dt) return '';
  return `${String(dt.hourOfDay || 0).padStart(2, '0')}:${String(dt.minutesOfHour || 0).padStart(2, '0')}`;
}

function getSlotDuration(slot) {
  if (!slot?.start?.timestamp || !slot?.end?.timestamp) return null;
  const startMs = new Date(slot.start.timestamp).getTime();
  const endMs = new Date(slot.end.timestamp).getTime();
  const diffMinutes = Math.round((endMs - startMs) / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) return `${hours} שעות`;
  return `${hours}:${String(minutes).padStart(2, '0')} שעות`;
}

export default function TimeSlotsSection({
  selectedSlot,
  setSelectedSlot,
  availableSlots = [],
  pricingByService,
  onContinue
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [today] = useState(() => startOfDay(new Date()));
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState(null); // תאריך שנבחר עם כמה שעות

  const { availableDates, slotsMap } = useMemo(
    () => getAvailabilityInfo(Array.isArray(availableSlots) ? availableSlots : []),
    [availableSlots]
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateClick = (day) => {
    const sod = startOfDay(day);
    if (isBefore(sod, today)) return;
    const dateStr = format(sod, 'yyyy-MM-dd');
    if (!availableDates.has(dateStr)) return;

    const daySlots = slotsMap.get(dateStr) || [];
    if (daySlots.length === 1) {
      setSelectedSlot(daySlots[0]);
      setTimePickerDate(null);
    } else if (daySlots.length > 1) {
      setTimePickerDate(dateStr);
    }
  };

  const handleTimeSelect = (slot) => {
    setSelectedSlot(slot);
    setTimePickerDate(null);
  };

  const isDateSelected = (date) => {
    if (!selectedSlot?.start) return false;
    const selectedDateStr = selectedSlot.start.localDateTime
      ? `${selectedSlot.start.localDateTime.year}-${String(selectedSlot.start.localDateTime.monthOfYear).padStart(2, '0')}-${String(selectedSlot.start.localDateTime.dayOfMonth).padStart(2, '0')}`
      : format(new Date(selectedSlot.start.timestamp), 'yyyy-MM-dd');
    return format(startOfDay(date), 'yyyy-MM-dd') === selectedDateStr;
  };

  // נתוני התאריך הנבחר
  const selectedInfo = useMemo(() => {
    if (!selectedSlot?.start) return null;
    const dt = selectedSlot.start.localDateTime;
    if (!dt) return null;

    const date = new Date(dt.year, dt.monthOfYear - 1, dt.dayOfMonth, dt.hourOfDay || 0, dt.minutesOfHour || 0);
    const dayName = format(date, 'EEEE', { locale: he });
    const dateFormatted = `${String(dt.dayOfMonth).padStart(2, '0')}/${String(dt.monthOfYear).padStart(2, '0')}/${String(dt.year).slice(-2)}`;
    const timeFormatted = `${String(dt.hourOfDay || 0).padStart(2, '0')}:${String(dt.minutesOfHour || 0).padStart(2, '0')}`;
    const duration = getSlotDuration(selectedSlot);

    return { dateFormatted, dayName, timeFormatted, duration };
  }, [selectedSlot]);

  // Slots לתאריך שנבחר לבחירת שעה
  const timePickerSlots = timePickerDate ? (slotsMap.get(timePickerDate) || []).sort((a, b) => {
    const timeA = a.start?.localDateTime?.hourOfDay || 0;
    const timeB = b.start?.localDateTime?.hourOfDay || 0;
    return timeA - timeB;
  }) : [];

  return (
    <div className="py-2" dir="rtl">
      <div className="rounded-xl border border-[#e8e8e8] bg-white p-1.5">
        {/* כותרת חודש */}
        <div className="mb-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-full p-1 transition-colors hover:bg-[#5E2F88]/10"
          >
            <ChevronRight className="w-5 h-5 text-[#581E83]" />
          </button>
          <h3 className="text-xs font-bold text-[#581E83]">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-full p-1 transition-colors hover:bg-[#5E2F88]/10"
          >
            <ChevronLeft className="w-5 h-5 text-[#581E83]" />
          </button>
        </div>

        {/* ימי השבוע */}
        <div className="grid grid-cols-7 gap-1 mb-0.5">
          {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(day => (
            <div key={day} className="text-center text-[10px] font-semibold text-[#581E83] py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* ימים — ריבועים קטנים עם מרווח */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const sod = startOfDay(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isPast = isBefore(sod, today);
            const dateStr = format(sod, 'yyyy-MM-dd');
            const hasSlot = availableDates.has(dateStr);
            const isSelected = isDateSelected(day);
            const daySlots = slotsMap.get(dateStr) || [];
            const minPrice = hasSlot ? getMinPriceForDate(daySlots, pricingByService) : null;
            const isDisabled = !isCurrentMonth || isPast || !hasSlot;
            const isHoliday = ISRAELI_HOLIDAYS[dateStr];
            const hasMultipleSlots = daySlots.length > 1;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                title={isHoliday || undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-lg text-[10px] transition-all h-9 w-full',
                  !isCurrentMonth && 'text-[#464646]/15',
                  isCurrentMonth && isDisabled && !isHoliday && 'text-[#b0b0b0] cursor-default',
                  isCurrentMonth && isHoliday && isDisabled && 'bg-[#DA9BFF]/30 text-[#7B3DB0] cursor-default',
                  isCurrentMonth && isHoliday && hasSlot && !isSelected && 'bg-[#DA9BFF]/40 text-[#581E83] hover:bg-[#DA9BFF]/60 cursor-pointer border border-[#DA9BFF]',
                  isCurrentMonth && !isPast && hasSlot && !isSelected && !isHoliday &&
                    'text-[#581E83] hover:bg-[#5E2F88]/15 cursor-pointer border border-[#5E2F88]/30 bg-[#5E2F88]/5',
                  isSelected && 'bg-[#5E2F88] text-white shadow-md cursor-pointer'
                )}
              >
                <span className={cn(
                  'font-semibold leading-none',
                  isCurrentMonth && isDisabled && !isHoliday && 'line-through decoration-[#b0b0b0]/60'
                )}>
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && !isPast && hasSlot && minPrice && (
                  <span className={cn(
                    'text-[5px] leading-none mt-0.5 whitespace-nowrap',
                    isSelected ? 'text-white/80' : 'text-[#5E2F88]/80'
                  )}>
                    החל מ{minPrice}₪
                  </span>
                )}
                {hasMultipleSlots && !isSelected && (
                  <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-[#5E2F88]" />
                )}
              </button>
            );
          })}
        </div>

        {/* מקרא */}
        <div className="mt-1.5 flex items-center justify-center gap-2 text-[9px] text-[#464646]/70">
          <div className="flex items-center gap-0.5">
            <div className="h-2 w-2 rounded bg-[#DA9BFF]/50 border border-[#DA9BFF]"></div>
            <span>חג</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-2 w-2 rounded border border-[#5E2F88]/30 bg-[#5E2F88]/5"></div>
            <span>זמין</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-2 w-2 rounded bg-[#5E2F88]"></div>
            <span>נבחר</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="relative h-2 w-2 rounded border border-[#5E2F88]/30 bg-[#5E2F88]/5">
              <span className="absolute -top-0.5 -left-0.5 w-1 h-1 rounded-full bg-[#5E2F88]" />
            </div>
            <span>כמה שעות</span>
          </div>
        </div>
      </div>

      {/* בחירת שעה — כשיש כמה סדנאות באותו יום */}
      <AnimatePresence>
        {timePickerDate && timePickerSlots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 rounded-xl border border-[#5E2F88]/20 bg-[#5E2F88]/5 overflow-hidden"
          >
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#581E83]">בחרו שעה:</span>
                <button
                  type="button"
                  onClick={() => setTimePickerDate(null)}
                  className="p-0.5 rounded hover:bg-[#5E2F88]/10"
                >
                  <X className="w-3.5 h-3.5 text-[#581E83]" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {timePickerSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTimeSelect(slot)}
                    className="px-3 py-1.5 rounded-lg border border-[#5E2F88]/30 bg-white text-xs font-medium text-[#581E83] hover:bg-[#5E2F88] hover:text-white hover:border-[#5E2F88] transition-colors"
                  >
                    {getSlotTime(slot)}
                    <span className="text-[9px] opacity-70 mr-1">({slot.openSpots} מקומות)</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* תצוגת תאריך נבחר עם אייקונים */}
      {selectedInfo && (
        <div className="mt-3 rounded-xl border border-[#5E2F88]/20 bg-[#5E2F88]/5 p-2.5">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#581E83]" />
              <span className="text-xs font-medium text-[#581E83]">{selectedInfo.dateFormatted}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#581E83]">{selectedInfo.dayName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#581E83]" />
              <span className="text-xs font-medium text-[#581E83]">{selectedInfo.timeFormatted}</span>
            </div>
            {selectedInfo.duration && (
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-[#581E83]" />
                <span className="text-xs font-medium text-[#581E83]">{selectedInfo.duration}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* כפתור המשך */}
      <div className="flex justify-center mt-3">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedSlot}
          className="bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          המשך לבחירת משתתפים
        </button>
      </div>

      {/* WhatsApp */}
      <div
        className="mt-2.5 rounded-lg border border-[#5E2F88]/15 bg-[#5E2F88]/5 overflow-hidden"
        onMouseEnter={() => setWhatsappOpen(true)}
        onMouseLeave={() => setWhatsappOpen(false)}
      >
        <button
          type="button"
          onClick={() => setWhatsappOpen(!whatsappOpen)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-right"
        >
          <span className="text-[10px] font-medium text-[#581E83]">
            🤔 לא מצאתם מועד שמתאים לכם?
          </span>
          <ChevronDown className={cn(
            'w-3 h-3 text-[#581E83] transition-transform shrink-0',
            whatsappOpen && 'rotate-180'
          )} />
        </button>
        {whatsappOpen && (
          <div className="px-2.5 pb-2 text-center">
            <p className="text-[10px] text-[#464646]/70 mb-1.5">
              נשמח למצוא עבורכם זמן שנוח. שלחו לנו הודעת וואטסאפ ונחזור אליכם בהקדם.
            </p>
            <a
              href="https://wa.link/jbfarf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-3 py-1 text-xs text-white font-medium hover:bg-[#20bd5a] transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              שלחו הודעה בוואטסאפ
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
