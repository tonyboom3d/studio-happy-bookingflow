import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';

// נתוני דוגמה לתאריכים
const generateSampleSlots = () => {
  const slots = [];
  const times = ['10:00', '14:00', '18:00'];
  
  for (let i = 1; i <= 14; i++) {
    const date = addDays(new Date(), i);
    const availableTimes = times.filter(() => Math.random() > 0.3);
    
    availableTimes.forEach(time => {
      slots.push({
        id: `slot-${i}-${time}`,
        date: date,
        time: time,
        available_spots: Math.floor(Math.random() * 3) + 1
      });
    });
  }
  
  return slots;
};

export default function TimeSlotsSection({ 
  selectedSlots, 
  setSelectedSlots, 
  totalMeetings, 
  onContinue,
  timerActive,
  setTimerActive 
}) {
  const [slots] = useState(generateSampleSlots());
  const [timeLeft, setTimeLeft] = useState(8 * 60); // 8 דקות בשניות

  // טיימר
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timerActive && timeLeft === 0) {
      window.location.reload();
    }
  }, [timerActive, timeLeft]);

  const toggleSlot = (slot) => {
    const isSelected = selectedSlots.some(s => s.id === slot.id);
    
    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => s.id !== slot.id));
    } else if (selectedSlots.length < totalMeetings) {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // קיבוץ לפי תאריך
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: slot.date,
        slots: []
      };
    }
    acc[dateKey].slots.push(slot);
    return acc;
  }, {});

  return (
    <div className="py-4">
      {/* כותרת */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <Calendar className="w-5 h-5 text-[#6B584C]" />
        <span className="text-lg font-medium text-[#6B584C]">
          בחרו {totalMeetings} מפגשים
        </span>
      </div>
      
      {/* הערה חשובה */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">יש לבחור {totalMeetings} מפגשים</p>
          <p className="text-xs text-blue-700 mt-1">ניתן לשנות את המפגשים 48 שעות לפני באזור האישי</p>
        </div>
      </div>

      {/* סטטוס בחירה */}
      <div className="mb-4 p-3 bg-[#fafafa] rounded-lg flex items-center justify-between">
        <span className="text-sm text-[#464646]">
          נבחרו {selectedSlots.length} מתוך {totalMeetings} מפגשים
        </span>
        {selectedSlots.length === totalMeetings && (
          <span className="text-sm text-[#ADC178] font-medium">✓ הושלם</span>
        )}
      </div>

      {/* תאריכים */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {Object.values(slotsByDate).map(({ date, slots: daySlots }) => (
          <div key={format(date, 'yyyy-MM-dd')}>
            <h3 className="text-sm font-medium text-[#6B584C] mb-2 sticky top-0 bg-white py-1">
              {format(date, 'EEEE, d בMMMM', { locale: he })}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {daySlots.map(slot => {
                const isSelected = selectedSlots.some(s => s.id === slot.id);
                const isDisabled = !isSelected && selectedSlots.length >= totalMeetings;
                
                return (
                  <motion.button
                    key={slot.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleSlot(slot)}
                    disabled={isDisabled}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200 text-center",
                      isSelected 
                        ? "border-[#ADC178] bg-[#ADC178] text-white" 
                        : "border-[#e8e8e8] hover:border-[#ADC178]/50 bg-white",
                      isDisabled && "opacity-40 cursor-not-allowed hover:border-[#e8e8e8]"
                    )}
                  >
                    <span className="text-lg font-medium">{slot.time}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* תאריכים נבחרים */}
      {selectedSlots.length > 0 && (
        <div className="mt-4 p-4 bg-[#ADC178]/10 rounded-xl">
          <h4 className="text-sm font-medium text-[#6B584C] mb-2">המפגשים שנבחרו:</h4>
          <div className="space-y-1">
            {selectedSlots.map(slot => (
              <div key={slot.id} className="text-sm text-[#464646]">
                {format(slot.date, 'EEEE d/M', { locale: he })} בשעה {slot.time}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* כפתור המשך */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={onContinue}
          disabled={selectedSlots.length !== totalMeetings}
          className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg disabled:opacity-50"
        >
          המשך לפרטים אישיים
        </Button>
      </div>
    </div>
  );
}