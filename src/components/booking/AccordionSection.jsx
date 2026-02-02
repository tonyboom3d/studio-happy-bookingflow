import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AccordionSection({ 
  title, 
  stepNumber, 
  isActive, 
  isCompleted, 
  isLocked, 
  onClick, 
  children 
}) {
  return (
    <div className={cn(
      "border rounded-xl overflow-hidden transition-all duration-300",
      isActive ? "border-[#ADC178] shadow-lg" : "border-[#e8e8e8]",
      isLocked && "opacity-60"
    )}>
      <button
        onClick={onClick}
        disabled={isLocked}
        className={cn(
          "w-full flex items-center justify-between p-4 md:p-5 text-right transition-colors duration-200",
          isActive ? "bg-[#fafafa]" : "bg-white hover:bg-[#fafafa]",
          isLocked && "cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
            isCompleted ? "bg-[#ADC178] text-white" : 
            isActive ? "bg-[#6B584C] text-white" : 
            "bg-[#e8e8e8] text-[#464646]"
          )}>
            {isCompleted ? <Check className="w-4 h-4" /> : 
             isLocked ? <Lock className="w-4 h-4" /> : 
             stepNumber}
          </div>
          <span className={cn(
            "text-lg font-medium",
            isActive ? "text-[#6B584C]" : "text-[#464646]"
          )}>
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isActive ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className={cn(
            "w-5 h-5 transition-colors",
            isActive ? "text-[#ADC178]" : "text-[#464646]"
          )} />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 md:p-6 pt-0 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}