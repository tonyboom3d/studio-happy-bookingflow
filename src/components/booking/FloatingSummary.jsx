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
  activeSection
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const basePrice = PRICING[participants] || 300;
  const productsPrice = cart.reduce((sum, p) => sum + p.price, 0);
  const woodExtra = woodType === 'new' ? (productsPrice * 0.2) : 0;
  const totalPrice = basePrice + productsPrice + woodExtra;

  const items = [
    {
      show: participants > 0,
      icon: Users,
      label: participants === 1 ? 'יחיד' : participants === 2 ? 'זוגי' : 'שלישייה',
      value: `₪${PRICING[participants]}`,
      active: activeSection === 1
    },
    {
      show: woodType,
      icon: TreeDeciduous,
      label: woodType === 'recycled' ? 'עץ ממוחזר' : 'עץ חדש',
      value: woodType === 'new' ? '+20%' : 'כלול',
      active: activeSection === 2
    },
    {
      show: cart.length > 0,
      icon: Package,
      label: `${cart.length} מוצרים`,
      value: `₪${productsPrice}`,
      active: activeSection === 3
    },
    {
      show: selectedSlots.length > 0,
      icon: Calendar,
      label: `${selectedSlots.length}/${totalMeetings || '?'} מפגשים`,
      value: '',
      active: activeSection === 4
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-[10px] left-[5%] right-[5%] w-[90%] md:left-auto md:right-6 md:bottom-6 md:w-[260px] md:max-w-[260px] z-50"
      style={{ direction: 'rtl' }}
    >
      <div className="bg-white/97 backdrop-blur-xl rounded-2xl shadow-xl border border-[#e8e8e8] overflow-hidden">
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