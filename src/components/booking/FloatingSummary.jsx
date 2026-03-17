import React, { useState, useEffect } from 'react';
import { addLog } from '@/components/VersionLogger';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TreeDeciduous, Package, Calendar, CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PRICING = {
  1: 300,
  2: 500,
  3: 650
};

export default function FloatingSummary({ 
  participants, 
  woodType, 
  cart, 
  selectedSlots,
  totalMeetings,
  activeSection,
  isSummaryPage = false // האם זה דף Summary נפרד (iframe)
}) {
  const [isOpen, setIsOpen] = useState(true); // פתוח כברירת מחדל בדף Summary
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // מספר מפגשים בפועל (ממוצרים/סלוטים)
  const rawSessionsCount = totalMeetings || 0;
  // בדיפולט תמיד לפחות מפגש אחד כדי לשקף כרטיס מינימום
  const sessionsCount = rawSessionsCount || 1;
  const basePricePerSession = PRICING[participants] || 300;
  // מחיר בסיס = מחיר כרטיס × מספר מפגשים (כרטיס הוא למפגש)
  const basePriceTotal = basePricePerSession * (sessionsCount || 1);
  // כמות כוללת של יחידות (אם אותו מוצר נבחר כמה פעמים)
  const totalItems = cart.reduce((sum, p) => {
    const qty = typeof p.quantity === 'number' ? p.quantity : 1;
    return sum + (qty > 0 ? qty : 1);
  }, 0);
  // מחיר מוצרים כולל כמות
  const productsPrice = cart.reduce((sum, p) => {
    const qty = typeof p.quantity === 'number' ? p.quantity : 1;
    return sum + (p.price || 0) * (qty > 0 ? qty : 1);
  }, 0);
  // תוספת עץ חדש — 20% ממחיר המוצרים בלבד
  const woodExtra = woodType === 'new' ? Math.round(productsPrice * 0.2) : 0;
  // סכ"ה: כרטיס × מפגשים + מוצרים + תוספת עץ
  const totalPrice = basePriceTotal + productsPrice + woodExtra;
  // תוספת מוצרים+עץ לתצוגה בשורת המוצרים (ללא מחיר בסיס)
  const productsLinePrice = productsPrice + woodExtra;

  const items = [
    // שורה 1: סוג כרטיס + מחיר למפגש
    {
      show: participants > 0,
      icon: Users,
      label: participants === 1 ? 'יחיד' : participants === 2 ? 'זוגי' : 'שלישייה',
      value: `₪${basePricePerSession} למפגש`,
      active: activeSection === 1
    },
    // שורה 2: מספר מפגשים + מחיר בסיס כולל (מינימום מפגש 1)
    {
      show: true,
      icon: Calendar,
      label: selectedSlots.length > 0
        ? `${selectedSlots.length}/${sessionsCount} מפגשים`
        : `${sessionsCount} מפגשים`,
      value: `₪${basePricePerSession} × ${sessionsCount} = ₪${basePriceTotal}`,
      active: activeSection === 4
    },
    // שורה 3: מוצרים + סוג העץ — מציג תוספת מחיר מוצרים בלבד (ללא כפילות עם מחיר בסיס)
    {
      show: cart.length > 0 && woodType,
      icon: Package,
      label: `${totalItems} מוצרים - ${woodType === 'recycled' ? 'עץ ממוחזר' : 'עץ חדש'}`,
      value: woodType === 'recycled'
        ? (productsPrice > 0 ? `₪${productsPrice}` : 'כלול')
        : `${productsLinePrice} ₪`,
      active: activeSection === 3
    },
  ].filter(item => item.show);

  // אם אין פריטים, הצג את הסיכום הבסיסי (רק עבור iframe נפרד)
  const showEmptyState = items.length === 0;

  // הסתרה כשהקטלוג פתוח - נשלט מ-ProductCatalogDrawer
  useEffect(() => {
    // האזנה להודעות על מצב הקטלוג מ-ProductCatalogDrawer
    const handleMessage = (event) => {
      if (event.data?.type === 'CATALOG_STATE_CHANGE') {
        setIsCatalogOpen(event.data.data?.isOpen || false);
        addLog(`Catalog ${event.data.data?.isOpen ? 'opened' : 'closed'} - summary ${event.data.data?.isOpen ? 'hidden' : 'shown'}`, 'info');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isCatalogOpen) return null; // הסתרה מוחלטת כשהקטלוג פתוח

  // בדף Summary נפרד - ללא positioning מיוחד וללא רקע
  const containerClass = isSummaryPage 
    ? "w-full" 
    : "fixed bottom-[10px] left-[5%] right-[5%] w-[90%] md:left-auto md:right-6 md:bottom-6 md:w-[260px] md:max-w-[260px] z-50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={containerClass}
      style={{ direction: 'rtl' }}
    >
      <div className={cn(
        "rounded-2xl border border-[#e8e8e8] overflow-hidden",
        isSummaryPage ? "bg-white" : "bg-white/97 backdrop-blur-xl"
      )}>
        {/* כותרת */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-[#6B584C] text-white px-4 py-2.5 flex items-center justify-between md:cursor-default"
        >
          <span className="font-semibold text-sm">סיכום הזמנה</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span className="font-bold text-base">₪{Math.round(totalPrice)}</span>
            </div>
            <div className="md:hidden">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* פריטים */}
        <AnimatePresence>
          {(isOpen || window.innerWidth >= 768) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden md:!h-auto md:!opacity-100"
            >
              <div className="p-3 space-y-2">
                {showEmptyState ? (
                  <div className="text-center text-sm text-gray-500 py-2">
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
                            "flex items-center justify-between text-sm p-2 rounded-lg transition-colors",
                            item.active ? "bg-[#ADC178]/20" : "bg-[#fafafa]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={cn(
                              "w-4 h-4",
                              item.active ? "text-[#ADC178]" : "text-[#6B584C]"
                            )} />
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}