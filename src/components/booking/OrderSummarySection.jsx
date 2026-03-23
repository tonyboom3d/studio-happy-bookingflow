import React from 'react';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';
import { OrderSummaryCard } from './FloatingSummary';

/**
 * שלב סיכום הזמנה — אחרי פרטים אישיים, לפני שליחה לתשלום.
 * משתמש ב־OrderSummaryCard עם אותה לוגיקת מחירים כמו חלונית הסיכום.
 */
export default function OrderSummarySection({
  participants,
  woodType,
  cart,
  selectedSlots,
  totalMeetings,
  activeSection,
  onPay,
  isSubmitting
}) {
  return (
    <div className="flex flex-col px-2 py-4 md:px-0" dir="rtl">
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa] p-3 text-right">
        <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-[#ADC178]" aria-hidden />
        <p className="text-sm leading-relaxed text-[#464646]">
          בדקו את פירוט העלויות לפני המעבר לתשלום. ניתן לפתוח ולסגור את הסיכום בכל עת.
        </p>
      </div>

      <OrderSummaryCard
        key="order-summary-step"
        participants={participants}
        woodType={woodType}
        cart={cart}
        selectedSlots={selectedSlots}
        totalMeetings={totalMeetings}
        activeSection={activeSection}
        initiallyExpanded={false}
        className="bg-white shadow-sm"
      />

      <div className="mt-6 flex justify-center">
        <Button
          type="button"
          onClick={onPay}
          disabled={isSubmitting}
          className="w-full max-w-sm bg-[#ADC178] px-8 py-3 text-lg text-white hover:bg-[#9ab569] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? 'מעביר לתשלום...' : 'המשך לתשלום'}
        </Button>
      </div>
    </div>
  );
}
