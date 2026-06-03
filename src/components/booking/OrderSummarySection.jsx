import React, { useMemo } from 'react';
import { Calendar, Clock, Users, Baby, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function OrderSummarySection({
  adults,
  children,
  selectedSlot,
  basePrice,
  totalPrice
}) {
  const parentChildPairs = Math.min(adults, children);
  const soloAdults = adults - parentChildPairs;

  // פורמט תאריך ושעה
  const dateTimeInfo = useMemo(() => {
    if (!selectedSlot?.start?.localDateTime) return null;
    const dt = selectedSlot.start.localDateTime;
    const date = new Date(dt.year, dt.monthOfYear - 1, dt.dayOfMonth, dt.hourOfDay || 0, dt.minutesOfHour || 0);
    return {
      date: format(date, 'EEEE, d בMMMM yyyy', { locale: he }),
      time: `${String(dt.hourOfDay || 0).padStart(2, '0')}:${String(dt.minutesOfHour || 0).padStart(2, '0')}`
    };
  }, [selectedSlot]);

  return (
    <div className="flex flex-col pb-2 md:pb-4 space-y-3" dir="rtl">
      
      {/* תאריך ושעה */}
      {dateTimeInfo && (
        <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-[#581E83]" />
            <span className="font-semibold text-[#581E83]">תאריך ושעה</span>
          </div>
          <div className="mr-7 space-y-1">
            <p className="text-[15px] text-[#464646]">{dateTimeInfo.date}</p>
            <div className="flex items-center gap-1.5 text-[14px] text-[#464646]/80">
              <Clock className="w-4 h-4" />
              <span>שעה {dateTimeInfo.time}</span>
            </div>
          </div>
        </div>
      )}

      {/* משתתפים */}
      <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-[#581E83]" />
          <span className="font-semibold text-[#581E83]">משתתפים</span>
        </div>
        <div className="mr-7 space-y-1">
          {parentChildPairs > 0 ? (
            <>
              {soloAdults > 0 && (
                <p className="text-[14px] text-[#464646]">
                  {soloAdults} {soloAdults === 1 ? 'מבוגר' : 'מבוגרים'}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-[14px] text-[#464646]">
                <Baby className="w-4 h-4" />
                <span>{parentChildPairs} {parentChildPairs === 1 ? 'זוג' : 'זוגות'} הורה+ילד</span>
              </div>
            </>
          ) : (
            <p className="text-[14px] text-[#464646]">
              {adults} {adults === 1 ? 'מבוגר' : 'מבוגרים'}
            </p>
          )}
        </div>
      </div>

      {/* סיכום מחיר */}
      <div className="rounded-xl border-2 border-[#5E2F88] bg-[#5E2F88]/5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#581E83]" />
            <span className="font-semibold text-[#581E83]">סה״כ לתשלום</span>
          </div>
          <span className="text-[22px] font-bold text-[#581E83]">₪{Math.round(totalPrice)}</span>
        </div>
        {basePrice > 0 && (
          <div className="mt-2 pt-2 border-t border-[#5E2F88]/20 text-[13px] text-[#464646]/80">
            <p>מחיר סדנה: ₪{basePrice}</p>
          </div>
        )}
      </div>
    </div>
  );
}
