import React from 'react';
import { OrderSummaryCard } from './FloatingSummary';

/**
 * תוכן שלב "סיכום הזמנה" — רק תצוגת פירוט (תשלום בשלב פרטים אישיים).
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
  return (
    <div className="flex flex-col pb-2 md:pb-4" dir="rtl">
      <p className="mb-3 text-right text-sm leading-relaxed text-black">
        כאן מוצגים כל רכיבי העלות לפי הבחירות שלך. אפשר לחזור לשלבים הקודמים לעדכון בכל עת.
      </p>

      <OrderSummaryCard
        key="order-summary-step"
        adults={adults}
        children={children}
        carpetSizes={carpetSizes}
        cart={cart}
        selectedSlot={selectedSlot}
        basePrice={basePrice}
        carpetSizeUpgradePrice={carpetSizeUpgradePrice}
        totalPrice={totalPrice}
        variant="step"
        className="shadow-none"
      />
    </div>
  );
}
