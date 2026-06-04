import React, { useState, useMemo } from 'react';
import { MessageCircle, ChevronDown, ChevronLeft, ChevronRight, Clock, Timer, X } from 'lucide-react';
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

const CLOSING_SOON_HOURS = 8;

function isSlotClosingSoon(slot) {
  if (!slot?.start?.timestamp) return false;
  const startTime = new Date(slot.start.timestamp).getTime();
  const now = Date.now();
  const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);
  return hoursUntilStart > 0 && hoursUntilStart <= CLOSING_SOON_HOURS;
}

function isDayClosingSoon(slots) {
  if (!slots?.length) return false;
  return slots.some(isSlotClosingSoon);
}

function getAvailabilityInfo(availableSlots) {
  const availableDates = new Set();
  const spotsMap = new Map();
  const slotsMap = new Map();

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

    const currentMax = spotsMap.get(dateStr) || 0;
    if (openSpots > currentMax) {
      spotsMap.set(dateStr, openSpots);
    }

    const daySlots = slotsMap.get(dateStr) || [];
    daySlots.push(slot);
    slotsMap.set(dateStr, daySlots);
    availableDates.add(dateStr);
  });

  return { availableDates, spotsMap, slotsMap };
}

function getMinPriceForDate(slots, pricingByService, serviceMinPrices) {
  if (!slots?.length) return null;

  let minPrice = Infinity;

  slots.forEach(slot => {
    // עדיפות ראשונה: serviceMinPrices מה-SDK
    if (serviceMinPrices && serviceMinPrices[slot.serviceId]) {
      const sdkPrice = serviceMinPrices[slot.serviceId].value;
      if (sdkPrice && sdkPrice < minPrice) {
        minPrice = sdkPrice;
      }
      return;
    }
    // Fallback: pricingByService הקיים
    const pricing = pricingByService?.[slot.serviceId];
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

function getSlotDurationMinutes(slot) {
  if (!slot?.start?.timestamp || !slot?.end?.timestamp) return 0;
  const startMs = new Date(slot.start.timestamp).getTime();
  const endMs = new Date(slot.end.timestamp).getTime();
  return Math.round((endMs - startMs) / 60000);
}

function formatDuration(minutes) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} שעות`;
  return `${hours}:${String(mins).padStart(2, '0')} שעות`;
}

function getSlotDuration(slot) {
  return formatDuration(getSlotDurationMinutes(slot));
}

// Tooltip קומפוננטה
function DayTooltip({ slots, pricingByService, serviceMinPrices, holiday, closingSoon, isVisible }) {
  if (!isVisible || !slots?.length) return null;

  const minPrice = getMinPriceForDate(slots, pricingByService, serviceMinPrices);
  const times = slots.map(slot => getSlotTime(slot)).sort();
  const uniqueTimes = [...new Set(times)].slice(0, 3);
  const durations = [...new Set(slots.map(slot => formatDuration(getSlotDurationMinutes(slot))).filter(Boolean))];

  // div חיצוני סטטי — מטפל אך ורק במיקום (לא ייסתר על ידי framer-motion)
  // motion.div פנימי — מטפל אך ורק באנימציה
  return (
    <div
      className="absolute z-[100] bottom-full mb-1.5"
      style={{ pointerEvents: 'none', left: '50%', transform: 'translateX(-50%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.13 }}
        className="bg-white rounded-lg shadow-lg border border-[#5E2F88]/20 p-2 whitespace-nowrap text-right"
      >
        <div className="space-y-1.5 text-[14px]">
          {/* הרשמה נסגרת בקרוב */}
          {closingSoon && (
            <div className="flex items-center gap-1.5 text-red-600 font-medium">
              <span>⏰</span>
              <span>ההרשמה נסגרת בקרוב!</span>
            </div>
          )}
          {/* חג */}
          {holiday && (
            <div className="flex items-center gap-1.5 text-[#7B3DB0] font-medium">
              <span>🎉</span>
              <span>{holiday}</span>
            </div>
          )}

          {/* מחיר */}
          {minPrice && (
            <div className="flex items-center gap-1.5 text-[#581E83]">
              <span>💰</span>
              <span>החל מ: {minPrice}₪</span>
            </div>
          )}

          {/* שעות הסדנאות */}
          <div className="flex items-center gap-1.5 text-[#464646]">
            <Clock className="w-4 h-4" />
            <span>{uniqueTimes.join(' | ')}</span>
          </div>

          {/* משך */}
          {durations.length > 0 && (
            <div className="flex items-center gap-1.5 text-[#464646]">
              <Timer className="w-4 h-4" />
              <span>{durations[0]}</span>
            </div>
          )}
        </div>

        {/* חץ */}
        <div
          className="absolute top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
      </motion.div>
    </div>
  );
}

export default function TimeSlotsSection({
  selectedSlot,
  setSelectedSlot,
  availableSlots = [],
  pricingByService,
  serviceMinPrices,
  onContinue
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [today] = useState(() => startOfDay(new Date()));
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);

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
    // לא סוגרים את חלונית השעות - המשתמש יכול לשנות בקלות
  };

  const isDateSelected = (date) => {
    if (!selectedSlot?.start) return false;
    const selectedDateStr = selectedSlot.start.localDateTime
      ? `${selectedSlot.start.localDateTime.year}-${String(selectedSlot.start.localDateTime.monthOfYear).padStart(2, '0')}-${String(selectedSlot.start.localDateTime.dayOfMonth).padStart(2, '0')}`
      : format(new Date(selectedSlot.start.timestamp), 'yyyy-MM-dd');
    return format(startOfDay(date), 'yyyy-MM-dd') === selectedDateStr;
  };

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
        <div className="grid grid-cols-7 gap-2 mb-0.5">
          {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(day => (
            <div key={day} className="text-center text-[20px] font-semibold text-[#581E83] py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* ימים */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, i) => {
            const sod = startOfDay(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isPast = isBefore(sod, today);
            const dateStr = format(sod, 'yyyy-MM-dd');
            const hasSlot = availableDates.has(dateStr);
            const isSelected = isDateSelected(day);
            const daySlots = slotsMap.get(dateStr) || [];
            const minPrice = hasSlot ? getMinPriceForDate(daySlots, pricingByService, serviceMinPrices) : null;
            const isDisabled = !isCurrentMonth || isPast || !hasSlot;
            const isHoliday = ISRAELI_HOLIDAYS[dateStr];
            const hasMultipleSlots = daySlots.length > 1;
            const closingSoon = hasSlot && isDayClosingSoon(daySlots);
            const isHovered = hoveredDate === dateStr && hasSlot;

            return (
              <div key={i} className="relative">
                <button
                  type="button"
                  onClick={() => handleDateClick(day)}
                  onMouseEnter={() => hasSlot && setHoveredDate(dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                  disabled={isDisabled}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-lg text-[18px] transition-all h-10 w-full',
                    !isCurrentMonth && 'text-[#464646]/15',
                    isCurrentMonth && isDisabled && 'text-[#b0b0b0] cursor-default',
                    isCurrentMonth && !isPast && hasSlot && !isSelected &&
                      'text-[#581E83] hover:bg-[#5E2F88]/15 cursor-pointer border border-[#5E2F88]/30 bg-[#5E2F88]/5',
                    isSelected && 'bg-[#5E2F88] text-white shadow-md cursor-pointer'
                  )}
                >
                  <span className={cn(
                    'font-semibold leading-none',
                    isCurrentMonth && isDisabled && 'line-through decoration-[#b0b0b0]/60'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {isCurrentMonth && !isPast && hasSlot && minPrice && (
                    <span className={cn(
                      'text-[9px] leading-none mt-0.5 whitespace-nowrap',
                      isSelected ? 'text-white/90' : 'text-[#5E2F88]/80'
                    )}>
                      החל מ: {minPrice}₪
                    </span>
                  )}
                  {/* עיגול לחגים */}
                  {isCurrentMonth && isHoliday && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#DA9BFF]" />
                  )}
                  {/* נקודה אדומה — ההרשמה נסגרת בקרוב */}
                  {closingSoon && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  )}
                  {/* עיגול למספר שעות */}
                  {hasMultipleSlots && !isSelected && (
                    <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-[#A9DEF9]" />
                  )}
                </button>

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <DayTooltip
                      slots={daySlots}
                      pricingByService={pricingByService}
                      serviceMinPrices={serviceMinPrices}
                      holiday={isHoliday}
                      closingSoon={closingSoon}
                      isVisible={true}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* מקרא */}
        <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-[#464646]/70">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded border border-[#5E2F88]/30 bg-[#5E2F88]/5"></div>
            <span>זמין</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded bg-[#5E2F88]"></div>
            <span>נבחר</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#A9DEF9]" />
            <span>כמה שעות</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#DA9BFF]" />
            <span>חג</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>נסגר בקרוב</span>
          </div>
        </div>
      </div>

      {/* בחירת שעה */}
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
              <div className="flex flex-wrap gap-2">
                {timePickerSlots.map((slot, idx) => {
                  const duration = getSlotDuration(slot);
                  const isThisSlotSelected = selectedSlot && 
                    getSlotTime(slot) === getSlotTime(selectedSlot) &&
                    slot.sessionId === selectedSlot.sessionId;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTimeSelect(slot)}
                      className={cn(
                        "px-4 py-2 rounded-lg border font-medium transition-colors",
                        isThisSlotSelected
                          ? "bg-[#5E2F88] text-white border-[#5E2F88]"
                          : "border-[#5E2F88]/30 bg-white text-[#581E83] hover:bg-[#5E2F88] hover:text-white hover:border-[#5E2F88]"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[18px]">{getSlotTime(slot)}</span>
                        <span className={cn("text-[16px]", isThisSlotSelected ? "opacity-80" : "opacity-70")}>{duration}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* תצוגת תאריך נבחר */}
      {selectedInfo && (
        <div className="mt-3 rounded-xl border border-[#5E2F88]/20 bg-[#5E2F88]/5 p-2.5">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <img 
                src="https://static.wixstatic.com/shapes/6b73e9_730f64536d7c4e65919f5fb531baee7d.svg" 
                alt="" 
                className="w-4 h-4" 
              />
              <span className="text-xs font-medium text-[#581E83]">{selectedInfo.dateFormatted}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img 
                src="https://static.wixstatic.com/shapes/6b73e9_e859379a99324600ae234a67d9615e62.svg" 
                alt="" 
                className="w-4 h-4" 
              />
              <span className="text-xs text-[#581E83]">{selectedInfo.dayName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-[#581E83]" />
              <span className="text-xs font-medium text-[#581E83]">{selectedInfo.timeFormatted}</span>
            </div>
            {selectedInfo.duration && (
              <div className="flex items-center gap-1.5">
                <img 
                  src="https://static.wixstatic.com/shapes/6b73e9_394fc0a900b54752a96ef85903f2a8ad.svg" 
                  alt="" 
                  className="w-4 h-4" 
                />
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
      <div className="mt-2.5 rounded-lg border border-[#5E2F88]/15 bg-[#5E2F88]/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setWhatsappOpen(!whatsappOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-right"
        >
          <span className="text-[16px] font-medium text-[#581E83]">
            🤔 לא מצאתם מועד שמתאים לכם?
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 text-[#581E83] transition-transform shrink-0',
            whatsappOpen && 'rotate-180'
          )} />
        </button>
        {whatsappOpen && (
          <div className="px-3 pb-3 text-center">
            <p className="text-[14px] text-[#464646]/70 mb-2">
              נשמח למצוא עבורכם זמן שנוח. שלחו לנו הודעת וואטסאפ ונחזור אליכם בהקדם.
            </p>
            <a
              href="https://wa.link/jbfarf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-4 py-1.5 text-sm text-white font-medium hover:bg-[#20bd5a] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              שלחו הודעה בוואטסאפ
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
