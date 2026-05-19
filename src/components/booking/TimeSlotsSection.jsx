import React, { useState, useMemo } from 'react';
import { Calendar, Info, MessageCircle } from 'lucide-react';
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
  addMonths,
  subMonths
} from 'date-fns';
import { he } from 'date-fns/locale';

// מחזיר מידע על תאריכים זמינים מכל השירותים
function getAvailabilityInfo(availableSlots) {
  const availableDates = new Set();
  const spotsMap = new Map(); // תאריך -> מספר מקומות מקסימלי
  const slotMap = new Map(); // תאריך -> slot מלא

  if (!Array.isArray(availableSlots)) {
    return { availableDates, spotsMap, slotMap };
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

    // שמירת מספר המקומות הפנויים המקסימלי לתאריך
    const currentMax = spotsMap.get(dateStr) || 0;
    if (openSpots > currentMax) {
      spotsMap.set(dateStr, openSpots);
      slotMap.set(dateStr, slot); // שומרים את ה-slot עם הכי הרבה מקומות
    }

    availableDates.add(dateStr);
  });

  return { availableDates, spotsMap, slotMap };
}

export default function TimeSlotsSection({
  selectedSlot,
  setSelectedSlot,
  availableSlots = [],
  onContinue
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [today] = useState(() => startOfDay(new Date()));

  // מידע על זמינות תאריכים
  const { availableDates, spotsMap, slotMap } = useMemo(
    () => getAvailabilityInfo(Array.isArray(availableSlots) ? availableSlots : []),
    [availableSlots]
  );

  // יצירת ימים בחודש
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

    const slot = slotMap.get(dateStr);
    if (slot) {
      setSelectedSlot(slot);
    }
  };

  const isDateSelected = (date) => {
    if (!selectedSlot?.start) return false;
    const selectedDateStr = selectedSlot.start.localDateTime
      ? `${selectedSlot.start.localDateTime.year}-${String(selectedSlot.start.localDateTime.monthOfYear).padStart(2, '0')}-${String(selectedSlot.start.localDateTime.dayOfMonth).padStart(2, '0')}`
      : format(new Date(selectedSlot.start.timestamp), 'yyyy-MM-dd');
    return format(startOfDay(date), 'yyyy-MM-dd') === selectedDateStr;
  };

  // פורמט תאריך נבחר לתצוגה
  const selectedDateDisplay = useMemo(() => {
    if (!selectedSlot?.start) return null;
    const dt = selectedSlot.start.localDateTime;
    if (dt) {
      const date = new Date(dt.year, dt.monthOfYear - 1, dt.dayOfMonth);
      return {
        date: format(date, 'd בMMMM yyyy', { locale: he }),
        day: format(date, 'EEEE', { locale: he }),
        spots: selectedSlot.openSpots || 0
      };
    }
    return null;
  }, [selectedSlot]);

  return (
    <div className="py-4" dir="rtl">
      {/* כותרת */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <Calendar className="h-5 w-5 text-[#581E83]" />
        <span className="text-lg font-medium text-[#581E83]">
          בחרו תאריך לסדנה
        </span>
      </div>

      {/* תאריך נבחר */}
      {selectedDateDisplay && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border-2 border-[#5E2F88] bg-[#5E2F88]/10 p-4 text-center"
        >
          <div className="text-sm text-[#581E83]/70">התאריך שנבחר:</div>
          <div className="text-xl font-bold text-[#581E83]">{selectedDateDisplay.day}</div>
          <div className="text-lg text-[#581E83]">{selectedDateDisplay.date}</div>
          <div className="mt-1 text-sm text-[#581E83]/70">
            {selectedDateDisplay.spots} מקומות פנויים
          </div>
        </motion.div>
      )}

      {/* לוח שנה */}
      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
        {/* כותרת חודש */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-2 transition-colors hover:bg-[#f5f5f5]"
          >
            →
          </button>
          <h3 className="font-medium text-[#581E83]">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-2 transition-colors hover:bg-[#f5f5f5]"
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

        {/* ימים */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const sod = startOfDay(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isPast = isBefore(sod, today);
            const dateStr = format(sod, 'yyyy-MM-dd');
            const hasSlot = availableDates.has(dateStr);
            const spots = spotsMap.get(dateStr) || 0;
            const isSelected = isDateSelected(day);

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDateClick(day)}
                disabled={!isCurrentMonth || isPast || !hasSlot}
                className={cn(
                  'relative aspect-square rounded-lg text-sm font-medium transition-all',
                  !isCurrentMonth && 'text-[#464646]/25',
                  isCurrentMonth && isPast && 'text-[#c4c4c4] cursor-default',
                  isCurrentMonth && !isPast && !hasSlot && 'text-[#c4c4c4] cursor-default',
                  isCurrentMonth && !isPast && hasSlot && !isSelected && 
                    'text-[#581E83] hover:bg-[#5E2F88]/20 cursor-pointer border border-[#5E2F88]/30',
                  isSelected && 'bg-[#5E2F88] text-white shadow-lg cursor-pointer'
                )}
              >
                <span>{format(day, 'd')}</span>
                {isCurrentMonth && !isPast && hasSlot && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-[#5E2F88]/70">
                    {spots}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* מקרא */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#464646]/70">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border border-[#5E2F88]/30"></div>
            <span>זמין</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-[#5E2F88]"></div>
            <span>נבחר</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Block */}
      <div className="mt-6 rounded-xl border border-[#5E2F88]/20 bg-[#5E2F88]/5 p-4">
        <div className="text-center">
          <div className="text-lg font-medium text-[#581E83] mb-2">
            🤔 לא מצאתם מועד שמתאים לכם? אנחנו כאן כדי לעזור!
          </div>
          <p className="text-sm text-[#464646]/80 mb-3">
            נשמח לעשות מאמץ ולמצוא עבורכם זמן שנוח לכם. שלחו לנו הודעת וואטסאפ עם הפרטים שלכם ונחזור אליכם בהקדם.
          </p>
          <a
            href="https://wa.link/jbfarf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-2.5 text-white font-medium hover:bg-[#20bd5a] transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            שלחו לנו הודעה בוואטסאפ
          </a>
        </div>
      </div>

      {/* כפתור המשך */}
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedSlot}
          className="bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-3 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          המשך לבחירת משתתפים
        </button>
      </div>
    </div>
  );
}
