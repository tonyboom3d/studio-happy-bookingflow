import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Calendar, MapPin, Phone, Mail, Home, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ThankYouScreen({ booking, paymentStatus = 'Successful', onGoHome }) {
  // Pending = התשלום טרם אושר במלואו
  const isPendingPayment = paymentStatus === 'Pending';
  const addToGoogleCalendar = () => {
    const firstSlot = booking.selected_slots?.[0];
    if (!firstSlot) return;
    
    const date = new Date(firstSlot.date);
    const startDate = format(date, "yyyyMMdd'T'HHmmss");
    const endDate = format(new Date(date.getTime() + 2 * 60 * 60 * 1000), "yyyyMMdd'T'HHmmss");
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('סדנת נגרות - הנגריה הפתוחה')}&dates=${startDate}/${endDate}&details=${encodeURIComponent('סדנת נגרות בהנגריה הפתוחה')}&location=${encodeURIComponent('הנגריה הפתוחה, דרך שלמה (סלמה) 19, תל אביב-יפו')}`;
    
    window.open(url, '_blank');
  };

  const generateICS = () => {
    const firstSlot = booking.selected_slots?.[0];
    if (!firstSlot) return;
    
    const date = new Date(firstSlot.date);
    const startDate = format(date, "yyyyMMdd'T'HHmmss");
    const endDate = format(new Date(date.getTime() + 2 * 60 * 60 * 1000), "yyyyMMdd'T'HHmmss");
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:סדנת נגרות - הנגריה הפתוחה
DESCRIPTION:סדנת נגרות בהנגריה הפתוחה
LOCATION:הנגריה הפתוחה, דרך שלמה (סלמה) 19, תל אביב-יפו
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workshop.ics';
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white to-[#fafafa]"
    >
      {/* אייקון הצלחה */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-24 h-24 rounded-full bg-[#ADC178] flex items-center justify-center mb-6 shadow-lg"
      >
        <Check className="w-12 h-12 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-[#6B584C] mb-2"
      >
        תודה רבה!
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-[#464646] mb-4 text-center"
      >
        ההזמנה שלך התקבלה בהצלחה. נתראה בנגריה!
      </motion.p>

      {/* הערה כתומה - תשלום ממתין לאישור */}
      {isPendingPayment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full max-w-md bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="text-right">
            <p className="text-sm font-medium text-orange-700">
              התשלום טרם אושר במלואו
            </p>
            <p className="text-xs text-orange-600 mt-1">
              ההזמנה נרשמה במערכת. נעדכן אותך ברגע שהתשלום יאושר על ידי חברת האשראי.
            </p>
          </div>
        </motion.div>
      )}

      {/* סיכום הזמנה */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 mb-6"
      >
        <h2 className="text-lg font-semibold text-[#6B584C] mb-4 border-b border-[#e8e8e8] pb-2">
          סיכום הזמנה
        </h2>

        {/* מוצרים */}
        {booking.products?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-[#464646] mb-2">מה נבנה:</h3>
            <ul className="space-y-1">
              {booking.products.map((product, idx) => (
                <li key={idx} className="text-sm text-[#464646]/80">
                  • {product.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* תאריכים */}
        {booking.selected_slots?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-[#464646] mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              מועדים:
            </h3>
            <ul className="space-y-1">
              {booking.selected_slots.map((slot, idx) => (
                <li key={idx} className="text-sm text-[#464646]/80">
                  {format(new Date(slot.date), 'EEEE d/M', { locale: he })} בשעה {slot.time}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* פרטי קשר */}
        <div className="pt-4 border-t border-[#e8e8e8] space-y-2">
        <div className="flex items-center gap-2 text-sm text-[#464646]">
          <MapPin className="w-4 h-4 text-[#ADC178]" />
          <span>הנגריה הפתוחה, דרך שלמה (סלמה) 19, תל אביב-יפו</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#464646]">
          <Phone className="w-4 h-4 text-[#ADC178]" />
          <span dir="ltr">055-721-9327</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#464646]">
          <Mail className="w-4 h-4 text-[#ADC178]" />
          <span>Noam.r89@gmail.com</span>
        </div>
        </div>
      </motion.div>

      {/* כפתורי פעולה */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        <Button
          variant="outline"
          onClick={addToGoogleCalendar}
          className="flex items-center gap-2 border-[#ADC178] text-[#6B584C]"
        >
          <Calendar className="w-4 h-4" />
          הוספה ל-Google Calendar
        </Button>
        <Button
          variant="outline"
          onClick={generateICS}
          className="flex items-center gap-2 border-[#ADC178] text-[#6B584C]"
        >
          <Calendar className="w-4 h-4" />
          הוספה ל-Apple Calendar
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8"
      >
        <Button
          onClick={onGoHome}
          className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8"
        >
          <Home className="w-4 h-4 ml-2" />
          חזרה לדף הבית
        </Button>
      </motion.div>
    </motion.div>
  );
}