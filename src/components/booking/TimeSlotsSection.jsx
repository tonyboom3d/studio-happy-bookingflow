import React, { useState, useMemo } from 'react';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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

function getAvailabilityInfo(availableSlots) {
  const availableDates = new Set();
  const spotsMap = new Map();
  const slotMap = new Map();

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

    const currentMax = spotsMap.get(dateStr) || 0;
    if (openSpots > currentMax) {
      spotsMap.set(dateStr, openSpots);
      slotMap.set(dateStr, slot);
    }
    availableDates.add(dateStr);
  });

  return { availableDates, spotsMap, slotMap };
}

function getMinPriceForSlot(slot, pricingByService) {
  if (!slot?.serviceId || !pricingByService) return null;
  const pricing = pricingByService[slot.serviceId];
  if (!pricing) return null;
  return pricing[1] || null;
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

  const { availableDates, slotMap } = useMemo(
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
    const slot = slotMap.get(dateStr);
    if (slot) setSelectedSlot(slot);
  };

  const isDateSelected = (date) => {
    if (!selectedSlot?.start) return false;
    const selectedDateStr = selectedSlot.start.localDateTime
      ? `${selectedSlot.start.localDateTime.year}-${String(selectedSlot.start.localDateTime.monthOfYear).padStart(2, '0')}-${String(selectedSlot.start.localDateTime.dayOfMonth).padStart(2, '0')}`
      : format(new Date(selectedSlot.start.timestamp), 'yyyy-MM-dd');
    return format(startOfDay(date), 'yyyy-MM-dd') === selectedDateStr;
  };

  return (
    <div className="py-3" dir="rtl">
      <div className="rounded-xl border border-[#e8e8e8] bg-white p-2.5 sm:p-3">
        {/* כותרת חודש */}
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-md p-1 text-sm transition-colors hover:bg-[#f5f5f5]"
          >→</button>
          <h3 className="text-sm font-semibold text-[#581E83]">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-md p-1 text-sm transition-colors hover:bg-[#f5f5f5]"
          >←</button>
        </div>

        {/* ימי השבוע */}
        <div className="grid grid-cols-7 gap-[3px] mb-1">
          {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-[#464646]/60">
              {day}
            </div>
          ))}
        </div>

        {/* ימים — ריבועים שווים */}
        <div className="grid grid-cols-7 gap-[3px]">
          {calendarDays.map((day, i) => {
            const sod = startOfDay(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isPast = isBefore(sod, today);
            const dateStr = format(sod, 'yyyy-MM-dd');
            const hasSlot = availableDates.has(dateStr);
            const isSelected = isDateSelected(day);
            const slot = slotMap.get(dateStr);
            const minPrice = hasSlot ? getMinPriceForSlot(slot, pricingByService) : null;
            const isDisabled = !isCurrentMonth || isPast || !hasSlot;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                className={cn(
                  'relative aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-all',
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
                    'text-[6.5px] leading-none mt-[2px] whitespace-nowrap',
                    isSelected ? 'text-white/80' : 'text-[#5E2F88]/80'
                  )}>
                    החל מ{minPrice}₪
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* כפתור המשך */}
      <div className="flex justify-center mt-4">
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedSlot}
          className="bg-[#5E2F88] hover:bg-[#7B3DB0] text-white px-8 py-2.5 rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          המשך לבחירת משתתפים
        </button>
      </div>

      {/* WhatsApp — קומפקטי, hover/click פותח */}
      <div
        className="mt-4 rounded-lg border border-[#5E2F88]/15 bg-[#5E2F88]/5 overflow-hidden"
        onMouseEnter={() => setWhatsappOpen(true)}
        onMouseLeave={() => setWhatsappOpen(false)}
      >
        <button
          type="button"
          onClick={() => setWhatsappOpen(!whatsappOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-right"
        >
          <span className="text-xs font-medium text-[#581E83]">
            🤔 לא מצאתם מועד שמתאים לכם?
          </span>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-[#581E83] transition-transform shrink-0',
            whatsappOpen && 'rotate-180'
          )} />
        </button>
        {whatsappOpen && (
          <div className="px-3 pb-3 text-center">
            <p className="text-xs text-[#464646]/70 mb-2">
              נשמח למצוא עבורכם זמן שנוח. שלחו לנו הודעת וואטסאפ ונחזור אליכם בהקדם.
            </p>
            <a
              href="https://wa.link/jbfarf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-4 py-1.5 text-sm text-white font-medium hover:bg-[#20bd5a] transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              שלחו הודעה בוואטסאפ
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
