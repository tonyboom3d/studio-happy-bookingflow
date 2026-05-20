import React, { useMemo } from 'react';
import { Calendar, Clock, Users, Baby, Ruler, ShoppingBag, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * תוכן שלב "סיכום הזמנה" — פירוט מלא ומעוצב.
 */
export default function OrderSummarySection({
  adults,
  children,
  carpetSizes,
  cart,
  selectedSlot,
  basePrice,
  carpetSizeUpgradePrice,
  totalPrice
}) {
  // חישובים
  const parentChildPairs = Math.min(adults, children);
  const soloAdults = adults - parentChildPairs;
  const size60Count = Object.values(carpetSizes).filter(s => s === '60x60').length;
  const size90Count = Object.values(carpetSizes).filter(s => s === '90x90').length;
  const totalItems = cart.reduce((sum, p) => sum + (p.quantity || 1), 0);

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

      {/* גדלי שטיחים */}
      <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-5 h-5 text-[#581E83]" />
          <span className="font-semibold text-[#581E83]">גדלי שטיחים</span>
        </div>
        <div className="mr-7 space-y-1">
          {size60Count > 0 && (
            <p className="text-[14px] text-[#464646]">
              {size60Count}× שטיח 60×60 ס״מ
            </p>
          )}
          {size90Count > 0 && (
            <p className="text-[14px] text-[#464646]">
              {size90Count}× שטיח 90×90 ס״מ <span className="text-[#5E2F88] font-medium">(+₪{size90Count * 100})</span>
            </p>
          )}
        </div>
      </div>

      {/* עיצובים נבחרים */}
      {cart.length > 0 && (
        <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-5 h-5 text-[#581E83]" />
            <span className="font-semibold text-[#581E83]">עיצובים נבחרים ({totalItems})</span>
          </div>
          <div className="mr-7 space-y-2">
            {cart.map((product, idx) => {
              const qty = product.quantity || 1;
              return (
                <div key={product._id || product.id || idx} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded overflow-hidden bg-white border border-[#e8e8e8] shrink-0">
                    {product.image && (
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="text-[14px] text-[#464646] flex-1 truncate">{product.title}</span>
                  {qty > 1 && (
                    <span className="text-[13px] text-[#5E2F88] font-medium">×{qty}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* סיכום מחיר */}
      <div className="rounded-xl border-2 border-[#5E2F88] bg-[#5E2F88]/5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#581E83]" />
            <span className="font-semibold text-[#581E83]">סה״כ לתשלום</span>
          </div>
          <span className="text-[22px] font-bold text-[#581E83]">₪{Math.round(totalPrice)}</span>
        </div>
        {(basePrice > 0 || carpetSizeUpgradePrice > 0) && (
          <div className="mt-2 pt-2 border-t border-[#5E2F88]/20 text-[13px] text-[#464646]/80">
            {basePrice > 0 && <p>מחיר סדנה: ₪{basePrice}</p>}
            {carpetSizeUpgradePrice > 0 && <p>תוספת שטיחים גדולים: +₪{carpetSizeUpgradePrice}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
