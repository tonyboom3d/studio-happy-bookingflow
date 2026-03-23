import React from 'react';
import { OrderSummaryCard } from './FloatingSummary';

/**
 * תוכן שלב "סיכום הזמנה" — רק תצוגת פירוט (תשלום בשלב פרטים אישיים).
 */
export default function OrderSummarySection({
  participants,
  woodType,
  cart,
  selectedSlots,
  totalMeetings,
  activeSection
}) {
  return (
    <div className="flex flex-col pb-2 md:pb-4" dir="rtl">
      <p className="mb-3 text-right text-sm leading-relaxed text-white/90">
        כאן מוצגים כל רכיבי העלות לפי הבחירות שלך. אפשר לחזור לשלבים הקודמים לעדכון בכל עת.
      </p>

      <OrderSummaryCard
        key="order-summary-step"
        participants={participants}
        woodType={woodType}
        cart={cart}
        selectedSlots={selectedSlots}
        totalMeetings={totalMeetings}
        activeSection={activeSection}
        variant="step"
        className="shadow-none"
      />
    </div>
  );
}
