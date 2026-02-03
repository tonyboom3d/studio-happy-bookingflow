import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TreeDeciduous, Package, Calendar, CreditCard, Clock } from 'lucide-react';
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

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-72 z-50"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#e8e8e8] overflow-hidden">
        {/* כותרת */}
        <div className="bg-[#6B584C] text-white px-4 py-2.5 flex items-center justify-between">
          <span className="font-medium text-sm">סיכום הזמנה</span>
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4" />
            <span className="font-bold">₪{totalPrice}</span>
          </div>
        </div>

        {/* פריטים */}
        <div className="p-3 space-y-2">
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
                    <span className="font-medium text-[#6B584C]">{item.value}</span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}