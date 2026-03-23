import React, { useMemo, useState, useEffect } from 'react';
import { addLog } from '@/components/VersionLogger';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Package, Calendar, CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRICING = {
  1: 300,
  2: 500,
  3: 650
};

/** חישוב שורות סיכום + סכום — משותף לחלונית הצפה ולתצוגה inline */
export function computeOrderSummary({
  participants,
  woodType,
  cart,
  selectedSlots,
  totalMeetings,
  activeSection
}) {
  const rawSessionsCount = totalMeetings || 0;
  const sessionsCount = rawSessionsCount || 1;
  const basePricePerSession = PRICING[participants] || 300;
  const basePriceTotal = basePricePerSession * (sessionsCount || 1);
  const totalItems = cart.reduce((sum, p) => {
    const qty = typeof p.quantity === 'number' ? p.quantity : 1;
    return sum + (qty > 0 ? qty : 1);
  }, 0);
  /** סכום מחירי קטלוג (לתוספת 20% בעץ חדש בלבד) */
  const catalogProductsSum = cart.reduce((sum, p) => {
    const qty = typeof p.quantity === 'number' ? p.quantity : 1;
    return sum + (p.price || 0) * (qty > 0 ? qty : 1);
  }, 0);
  const woodExtra = woodType === 'new' ? Math.round(catalogProductsSum * 0.2) : 0;
  /** בעץ ממוחזר המוצרים כלולים במחיר המפגשים — לא מוסיפים מחיר קטלוג */
  const productsCharged = woodType === 'recycled' ? 0 : catalogProductsSum;
  const totalPrice = basePriceTotal + productsCharged + woodExtra;
  const productsLinePrice = catalogProductsSum + woodExtra;

  const items = [
    {
      show: participants > 0,
      icon: Users,
      label: participants === 1 ? 'יחיד' : participants === 2 ? 'זוגי' : 'שלישייה',
      value: `₪${basePricePerSession} למפגש`,
      active: activeSection === 1
    },
    {
      show: true,
      icon: Calendar,
      label: selectedSlots.length > 0
        ? `${selectedSlots.length}/${sessionsCount} מפגשים`
        : `${sessionsCount} מפגשים`,
      value: `₪${basePricePerSession} × ${sessionsCount} = ₪${basePriceTotal}`,
      active: activeSection === 4
    },
    {
      show: cart.length > 0 && woodType,
      icon: Package,
      label: `${totalItems} מוצרים - ${woodType === 'recycled' ? 'עץ ממוחזר' : 'עץ חדש'}`,
      value: woodType === 'recycled'
        ? 'כלול במחיר'
        : `${productsLinePrice} ₪`,
      active: activeSection === 3
    },
  ].filter(item => item.show);

  const showEmptyState = items.length === 0;

  return {
    items,
    totalPrice,
    showEmptyState
  };
}

/**
 * תצוגת סיכום הזמנה (כרטיס) — לשימוש מתחת לכפתור תשלום במובייל או בדף summary
 */
export function OrderSummaryCard({
  participants,
  woodType,
  cart,
  selectedSlots,
  totalMeetings,
  activeSection,
  /** true: ללא כפתור כותרת מתרחב, תמיד פתוח — מתחת ל"המשך לתשלום" */
  inline = false,
  /** כשלא inline: מצב התחלתי של פירוט השורות (ברירת מחדל פתוח — תואם חלונית צפה) */
  initiallyExpanded = true,
  /**
   * שלב סיכום באקורדיון: כותרת + פירוט תמיד גלויים, ללא כפתור כיווץ,
   * רקע לבן וטקסט כהה (לא משפיע על חלונית צפה / iframe)
   */
  variant = 'default',
  className
}) {
  const isStepVariant = variant === 'step';
  const expandable = !inline && !isStepVariant;

  const { items, totalPrice, showEmptyState } = useMemo(
    () =>
      computeOrderSummary({
        participants,
        woodType,
        cart,
        selectedSlots,
        totalMeetings,
        activeSection
      }),
    [participants, woodType, cart, selectedSlots, totalMeetings, activeSection]
  );

  const [isOpen, setIsOpen] = useState(isStepVariant ? true : initiallyExpanded);

  const headerInner = (
    <>
      <span
        className={cn(
          'font-semibold text-sm',
          isStepVariant ? 'text-black' : ''
        )}
      >
        סיכום הזמנה
      </span>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <CreditCard
            className={cn('w-4 h-4', isStepVariant ? 'text-[#6B584C]' : '')}
          />
          <span
            className={cn(
              'font-bold text-base',
              isStepVariant ? 'text-black tabular-nums' : ''
            )}
          >
            ₪{Math.round(totalPrice)}
          </span>
        </div>
        {expandable && (
          <div className="shrink-0">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        )}
      </div>
    </>
  );

  const body = (
    <div className={cn('p-3 space-y-2', isStepVariant && 'pt-1')}>
      {showEmptyState ? (
        <div
          className={cn(
            'py-2 text-center text-sm',
            isStepVariant ? 'text-gray-600' : 'text-gray-500'
          )}
        >
          ממתין לנתוני הזמנה...
        </div>
      ) : (
        <AnimatePresence>
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  'flex items-center justify-between rounded-lg p-2 text-sm transition-colors',
                  item.active
                    ? 'bg-[#ADC178]/20'
                    : 'bg-[#fafafa]'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      item.active ? 'text-[#ADC178]' : 'text-[#6B584C]'
                    )}
                  />
                  <span className="text-[#464646]">{item.label}</span>
                </div>
                {item.value && (
                  <span className="font-semibold text-[#6B584C]">{item.value}</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );

  const headerBarClass = cn(
    'flex w-full items-center justify-between px-4 py-2.5',
    isStepVariant
      ? 'border-b border-[#e8e8e8] bg-white text-black'
      : 'bg-[#6B584C] text-white'
  );

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border',
        isStepVariant ? 'border-[#e8e8e8] bg-white' : 'border-[#e8e8e8]',
        className
      )}
      style={{ direction: 'rtl' }}
    >
      {inline ? (
        <>
          <div className={headerBarClass}>{headerInner}</div>
          {body}
        </>
      ) : isStepVariant ? (
        <>
          <div className={headerBarClass}>{headerInner}</div>
          {body}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(headerBarClass, 'cursor-pointer')}
          >
            {headerInner}
          </button>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {body}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default function FloatingSummary({
  participants,
  woodType,
  cart,
  selectedSlots,
  totalMeetings,
  activeSection,
  isSummaryPage = false
}) {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'CATALOG_STATE_CHANGE') {
        setIsCatalogOpen(event.data.data?.isOpen || false);
        addLog(
          `Catalog ${event.data.data?.isOpen ? 'opened' : 'closed'} - summary ${event.data.data?.isOpen ? 'hidden' : 'shown'}`,
          'info'
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isCatalogOpen) return null;

  const containerClass = isSummaryPage
    ? 'w-full'
    : 'fixed bottom-[10px] left-[5%] right-[5%] w-[90%] md:left-auto md:right-6 md:bottom-6 md:w-[260px] md:max-w-[260px] z-50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={containerClass}
      style={{ direction: 'rtl' }}
    >
      <OrderSummaryCard
        participants={participants}
        woodType={woodType}
        cart={cart}
        selectedSlots={selectedSlots}
        totalMeetings={totalMeetings}
        activeSection={activeSection}
        inline={false}
        className={isSummaryPage ? 'bg-white' : 'bg-white/97 backdrop-blur-xl'}
      />
    </motion.div>
  );
}
