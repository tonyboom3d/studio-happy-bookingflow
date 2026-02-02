import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Info, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isBefore, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

export default function TimeSlotsSection({ 
  selectedSlots, 
  setSelectedSlots, 
  totalMeetings, 
  onContinue,
  timerActive,
  setTimerActive 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  
  const today = startOfDay(new Date());
  
  // יצירת משבצות למפגשים
  const slots = Array.from({ length: totalMeetings }, (_, i) => ({
    index: i,
    date: selectedDates[i] || null
  }));

  const handleDateSelect = (date) => {
    if (isBefore(startOfDay(date), today)) return;
    
    // אם כבר יש תאריך זה, נסיר אותו
    const existingIndex = selectedDates.findIndex(d => d && isSameDay(d, date));
    if (existingIndex !== -1) {
      const newDates = [...selectedDates];
      newDates[existingIndex] = null;
      setSelectedDates(newDates);
      return;
    }
    
    // אם המשבצת הנוכחית ריקה, נמלא אותה
    if (currentSlotIndex < totalMeetings) {
      const newDates = [...selectedDates];
      newDates[currentSlotIndex] = date;
      setSelectedDates(newDates);
      
      // מעבר למשבצת הריקה הבאה
      const nextEmptyIndex = newDates.findIndex((d, i) => i > currentSlotIndex && !d);
      if (nextEmptyIndex !== -1) {
        setCurrentSlotIndex(nextEmptyIndex);
      } else if (newDates.filter(Boolean).length < totalMeetings) {
        setCurrentSlotIndex(newDates.findIndex(d => !d));
      }
    }
  };
  
  const handleSlotClick = (index) => {
    setCurrentSlotIndex(index);
  };
  
  const removeDate = (index) => {
    const newDates = [...selectedDates];
    newDates[index] = null;
    setSelectedDates(newDates);
    setCurrentSlotIndex(index);
  };

  // יצירת ימים בחודש
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const isDateSelected = (date) => {
    return selectedDates.some(d => d && isSameDay(d, date));
  };
  
  const getDateSelectionNumber = (date) => {
    const index = selectedDates.findIndex(d => d && isSameDay(d, date));
    return index !== -1 ? index + 1 : null;
  };

  return (
    <div className="py-4">
      {/* כותרת */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <Calendar className="w-5 h-5 text-[#6B584C]" />
        <span className="text-lg font-medium text-[#6B584C]">
          בחרו {totalMeetings} תאריכי מפגש
        </span>
      </div>
      
      {/* הערה חשובה */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="text-xs text-blue-700">לחצו על התאריכים הרצויים בלוח השנה • ניתן לשנות 48 שעות לפני באזור האישי</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* משבצות מפגשים */}
        <div>
          <h3 className="text-sm font-medium text-[#6B584C] mb-3">המפגשים שלי:</h3>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot, index) => (
              <motion.button
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSlotClick(index)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200 relative",
                  currentSlotIndex === index
                    ? "border-[#ADC178] bg-[#ADC178]/10 shadow-md"
                    : slot.date
                    ? "border-[#ADC178]/50 bg-white"
                    : "border-[#e8e8e8] bg-[#fafafa]"
                )}
              >
                <div className="text-xs text-[#464646]/70 mb-1">מפגש {index + 1}</div>
                {slot.date ? (
                  <>
                    <div className="text-sm font-medium text-[#6B584C]">
                      {format(slot.date, 'd/M/yy', { locale: he })}
                    </div>
                    <div className="text-xs text-[#464646]/70 mt-0.5">
                      {format(slot.date, 'EEEE', { locale: he })}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDate(index);
                      }}
                      className="absolute top-2 left-2 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-[#464646]/50">לחץ לבחירה</div>
                )}
                {currentSlotIndex === index && !slot.date && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#ADC178]"
                  />
                )}
              </motion.button>
            ))}
          </div>
          
          <div className="mt-3 p-2 bg-[#fafafa] rounded-lg text-center">
            <span className="text-sm text-[#464646]">
              נבחרו {selectedDates.filter(Boolean).length} מתוך {totalMeetings}
            </span>
            {selectedDates.filter(Boolean).length === totalMeetings && (
              <span className="text-sm text-[#ADC178] font-medium mr-2">✓</span>
            )}
          </div>
        </div>

        {/* לוח שנה */}
        <div>
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-4">
            {/* כותרת חודש */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                className="p-2 hover:bg-[#fafafa] rounded-lg transition-colors"
              >
                ←
              </button>
              <h3 className="font-medium text-[#6B584C]">
                {format(currentMonth, 'MMMM yyyy', { locale: he })}
              </h3>
              <button
                onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                className="p-2 hover:bg-[#fafafa] rounded-lg transition-colors"
              >
                →
              </button>
            </div>

            {/* ימי השבוע */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-[#464646]/70 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* ימים */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isPast = isBefore(startOfDay(day), today);
                const isSelected = isDateSelected(day);
                const selectionNumber = getDateSelectionNumber(day);
                
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDateSelect(day)}
                    disabled={isPast}
                    className={cn(
                      "aspect-square rounded-lg text-sm font-medium transition-all duration-200 relative",
                      !isCurrentMonth && "text-[#464646]/30",
                      isPast && "cursor-not-allowed opacity-30",
                      !isPast && !isSelected && isCurrentMonth && "hover:bg-[#ADC178]/20 text-[#6B584C]",
                      isSelected && "bg-[#ADC178] text-white shadow-md"
                    )}
                  >
                    {format(day, 'd')}
                    {isSelected && selectionNumber && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6B584C] text-white text-[10px] flex items-center justify-center">
                        {selectionNumber}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* כפתור המשך */}
      <div className="flex justify-center mt-6">
        <Button
          onClick={() => {
            setSelectedSlots(selectedDates.filter(Boolean).map((date, i) => ({
              id: `slot-${i}`,
              date: date,
              time: '10:00'
            })));
            onContinue();
          }}
          disabled={selectedDates.filter(Boolean).length !== totalMeetings}
          className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg disabled:opacity-50"
        >
          המשך לפרטים אישיים
        </Button>
      </div>
    </div>
  );
}