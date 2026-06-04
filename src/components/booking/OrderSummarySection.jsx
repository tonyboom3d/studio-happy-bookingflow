import React, { useMemo } from 'react';
import { Calendar, Clock, Users, Baby } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function OrderSummarySection({
  adults,
  children,
  soloAdults,
  parentChildPairs,
  selectedSlot,
  servicePricing,
  totalPrice
}) {
  const dateTimeInfo = useMemo(() => {
    if (!selectedSlot?.start?.localDateTime) return null;
    const dt = selectedSlot.start.localDateTime;
    const date = new Date(dt.year, dt.monthOfYear - 1, dt.dayOfMonth, dt.hourOfDay || 0, dt.minutesOfHour || 0);
    return {
      date: format(date, 'EEEE, d בMMMM', { locale: he }),
      time: `${String(dt.hourOfDay || 0).padStart(2, '0')}:${String(dt.minutesOfHour || 0).padStart(2, '0')}`
    };
  }, [selectedSlot]);

  const pricing = servicePricing?.[selectedSlot?.serviceId];
  const soloUnitPrice = pricing?.solo || 0;
  const parentChildUnitPrice = pricing?.parentChild || soloUnitPrice;

  return (
    <div className="flex flex-col py-2 px-1 space-y-2" dir="rtl">
      {/* שורת תאריך + משתתפים */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#464646]">
        {dateTimeInfo && (
          <>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#5E2F88]" />
              {dateTimeInfo.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#5E2F88]" />
              {dateTimeInfo.time}
            </span>
          </>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-[#5E2F88]" />
          {adults} {adults === 1 ? 'מבוגר' : 'מבוגרים'}
          {children > 0 && ` + ${children} ${children === 1 ? 'ילד' : 'ילדים'}`}
        </span>
      </div>

      {/* פירוט מחיר */}
      <div className="border-t border-[#e8e8e8] pt-2 space-y-1 text-[13px] text-[#464646]">
        {soloAdults > 0 && (
          <div className="flex justify-between">
            <span>{soloAdults} × כרטיס יחיד</span>
            <span>₪{soloAdults * soloUnitPrice}</span>
          </div>
        )}
        {parentChildPairs > 0 && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              <Baby className="w-3.5 h-3.5" />
              {parentChildPairs} × הורה + ילד
            </span>
            <span>₪{parentChildPairs * parentChildUnitPrice}</span>
          </div>
        )}
      </div>

      {/* סה"כ */}
      <div className="flex items-center justify-between border-t-2 border-[#5E2F88]/30 pt-2">
        <span className="font-bold text-[15px] text-[#581E83]">סה״כ לתשלום</span>
        <span className="text-[20px] font-bold text-[#581E83]">₪{Math.round(totalPrice)}</span>
      </div>
    </div>
  );
}
