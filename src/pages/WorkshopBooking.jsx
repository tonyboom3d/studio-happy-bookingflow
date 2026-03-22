import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import AccordionSection from '../components/booking/AccordionSection';
import ParticipantsSection from '../components/booking/ParticipantsSection';
import WoodTypeSection from '../components/booking/WoodTypeSection';
import ProductSelectionSection from '../components/booking/ProductSelectionSection';
import TimeSlotsSection from '../components/booking/TimeSlotsSection';
import PersonalDetailsSection from '../components/booking/PersonalDetailsSection';
import ThankYouScreen from '../components/booking/ThankYouScreen';
import { submitBooking, subscribeToWix, notifyProgress, sendSummaryUpdate } from '@/api/wixBridge';
import { addLog, APP_VERSION } from '@/components/VersionLogger';

export default function WorkshopBooking() {
  // State ראשי
  const [activeSection, setActiveSection] = useState(1);
  const [completedSections, setCompletedSections] = useState([]);

  // נתוני ההזמנה
  const [participants, setParticipants] = useState(1);
  const [woodType, setWoodType] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [userDetails, setUserDetails] = useState({ name: '', email: '', phone: '' });

  // נתונים מ-Wix
  const [wixProducts, setWixProducts] = useState(null);
  const [wixSlots, setWixSlots] = useState(null);

  // סטטוס
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('Successful');
  const [timerActive, setTimerActive] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // טיימר מינימום 3 שניות לטעינה
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // האזנה לנתונים מ-Wix
  useEffect(() => {
    addLog('Subscribing to Wix data', 'info');
    const unsubscribe = subscribeToWix((data) => {
      if (data.products) {
        setWixProducts(data.products);
        addLog(`Loaded ${data.products.length} products`, 'success');
      }
      if (data.slots) {
        setWixSlots(data.slots);
        addLog(`Loaded ${data.slots.length} time slots`, 'success');
      }
      if (data.bookingConfirmed) {
        // Wix confirmed booking saved (either legacy Wix Pay or eCommerce checkout)
        setIsProcessing(false);
        setIsComplete(true);
        setPaymentStatus(data.paymentStatus || 'Successful');
        addLog(`Booking confirmed! Payment status: ${data.paymentStatus}`, 'success');

        // אם הגיע מ-ORDER_CONFIRMED (eCommerce checkout), נשמור את נתוני ה-order
        // ונשתמש בהם לבניית אובייקט booking מינימלי לתצוגה בדף תודה
        if (data.orderData) {
          setBooking(prev => {
            // אם כבר יש booking מה-submit (flow רגיל) — נשמר
            if (prev) return prev;
            // אחרת — בונה booking מינימלי מנתוני ה-order
            return {
              full_name: `${data.orderData.buyerInfo?.firstName || ''} ${data.orderData.buyerInfo?.lastName || ''}`.trim(),
              email: data.orderData.buyerInfo?.email || '',
              phone: data.orderData.buyerInfo?.phone || '',
              participants: 1,
              wood_type: 'recycled',
              products: [],
              selected_slots: [],
              total_sessions: 1,
              _fromOrder: true,
              orderNumber: data.orderData.orderNumber,
              orderTotal: data.orderData.total
            };
          });
        }
      }
      if (data.bookingError) {
        setIsProcessing(false);
        setBookingError(data.bookingError);
        addLog(`Booking error: ${data.bookingError}`, 'error');
      }
    });

    return unsubscribe;
  }, []);

  // עדכון Wix על התקדמות
  useEffect(() => {
    addLog(`Active section changed to: ${activeSection}`, 'info');
    notifyProgress(activeSection, {
      participants,
      woodType,
      cartCount: cart.length,
      slotsCount: selectedSlots.length
    });
  }, [activeSection, participants, woodType, cart.length, selectedSlots.length]);

  const MAX_SESSIONS = 8;

  // עדכון כמות מוצר בעגלה (מינימום 1, עם הגבלת 8 מפגשים סה"כ)
  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      const currentTotal = prev.reduce((sum, p) => sum + (p.meetings || 3) * (p.quantity || 1), 0);
      return prev.map(p => {
        const pid = p._id || p.id;
        if (pid === productId) {
          const productMeetings = p.meetings || 3;
          const newQty = Math.max(1, (p.quantity || 1) + delta);
          // מניעת חריגה מ-8 מפגשים בעת הוספה
          if (delta > 0) {
            const meetingsAfterAdd = currentTotal + productMeetings;
            if (meetingsAfterAdd > MAX_SESSIONS) return p;
          }
          return { ...p, quantity: newQty };
        }
        return p;
      });
    });
  };

  // חישוב סה"כ מפגשים (כולל כמויות)
  const totalMeetings = cart.reduce((sum, p) => sum + (p.meetings || 3) * (p.quantity || 1), 0);

  // שליחת נתוני סיכום ל-Wix VELO (שיעביר ל-summary iframe)
  useEffect(() => {
    const summaryData = {
      participants,
      woodType,
      cart: cart.map(p => ({ id: p.id, title: p.title, price: p.price, meetings: p.meetings, quantity: p.quantity || 1 })),
      selectedSlots,
      totalMeetings,
      activeSection,
      // מידע עבור שליטה על התנהגות חלונית הסיכום
      isProcessing,
      isComplete,
      hasPaymentError: !!bookingError
    };
    
    // שליחה ל-Wix VELO דרך window.parent.postMessage
    // Wix VELO יעביר את הנתונים ל-summary iframe (htmlComponent2)
    sendSummaryUpdate(summaryData);
  }, [participants, woodType, cart, selectedSlots, totalMeetings, activeSection, isProcessing, isComplete, bookingError]);

  // מעבר לסקשן הבא
  const completeSection = (sectionNum) => {
    if (!completedSections.includes(sectionNum)) {
      setCompletedSections([...completedSections, sectionNum]);
    }
    setActiveSection(sectionNum + 1);
    addLog(`Section ${sectionNum} completed, moving to section ${sectionNum + 1}`, 'success');
  };

  // פתיחת סקשן
  const openSection = (sectionNum) => {
    if (sectionNum <= activeSection || completedSections.includes(sectionNum - 1)) {
      setActiveSection(sectionNum);
    }
  };

  // שליחת ההזמנה — מפעיל את תהליך ה-checkout ב-Wix
  const handleSubmit = async () => {
    setBookingError(null);
    addLog('Starting booking submission...', 'info');
    setIsProcessing(true);

    const bookingData = {
      participants,
      wood_type: woodType,
      products: cart.map(p => ({ product_id: p.id, _id: p._id || p.id, title: p.title, price: p.price, quantity: p.quantity || 1, addOnId: p.addOnId, image: p.image || null })),
      selected_slots: selectedSlots.map(s => ({
        slot_id: s.id,
        date: s.date?.toISOString?.() || s.date,
        time: s.time,
        sessionId: s.sessionId || null
      })),
      total_price: cart.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0),
      total_sessions: totalMeetings,
      status: 'pending',
      userDetails: {
        name: userDetails.name?.trim() || '',
        email: userDetails.email?.trim() || '',
        phone: userDetails.phone?.trim() || ''
      }
    };

    // לוג מפורט לבדיקת ה-booking בצד הפרונט
    console.log('[Booking][Frontend] bookingData being sent to Wix:', JSON.stringify(bookingData, null, 2));

    addLog(`Submitting booking with ${cart.length} products, ${selectedSlots.length} slots`, 'info');
    submitBooking(bookingData);

    // אם לא מתקבלת תגובה מ-Wix תוך 60 שניות — timeout
    setTimeout(() => {
      setIsProcessing(prev => {
        if (!prev) return prev;
        setBookingError(prevError => prevError || 'timeout');
        return false;
      });
    }, 60000);
  };

  // מסך טעינה ראשוני - שימוש ב-CSS animations במקום framer-motion לחיסכון בזיכרון
  if (!minTimeElapsed || !wixProducts) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-6">
            {/* CSS animation במקום framer-motion repeat: Infinity */}
            <div className="w-20 h-20 border-4 border-[#e8e8e8] border-t-[#ADC178] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#ADC178] animate-pulse" />
            </div>
          </div>
          {/* CSS animation במקום framer-motion repeat: Infinity */}
          <h2 className="text-2xl font-bold text-[#6B584C] animate-pulse">
            הנגריה הפתוחה
          </h2>
          <p className="text-[#464646]/70 mt-2">טוען נתונים...</p>
        </motion.div>
      </div>
    );
  }

  // אם ההזמנה הושלמה
  if (isComplete) {
    return (
      <ThankYouScreen
        booking={booking}
        paymentStatus={paymentStatus}
        onGoHome={() => {
          setIsComplete(false);
          setActiveSection(1);
          setCompletedSections([]);
          setParticipants(1);
          setWoodType('');
          setCart([]);
          setSelectedSlots([]);
          setUserDetails({ name: '', email: '', phone: '' });
          setBooking(null);
          setPaymentStatus('Successful');
        }}
      />
    );
  }

  // מסך עיבוד - שימוש ב-CSS animation במקום framer-motion לחיסכון בזיכרון
  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        {/* CSS animation במקום framer-motion repeat: Infinity */}
        <Loader2 className="w-12 h-12 text-[#ADC178] animate-spin" />
        <p className="mt-4 text-lg text-[#6B584C]">דף התשלום נטען, כמה רגעים...</p>
      </div>
    );
  }

  const sections = [
    { id: 1, title: 'כמה תיהיו?' },
    { id: 2, title: 'סוג העץ' },
    { id: 3, title: 'מה בונים?' },
    { id: 4, title: 'בחירת תאריכים' },
    { id: 5, title: 'פרטים אישיים' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafafa]" dir="rtl">
      {/* Header — קומפקטי במובייל, ללא אנימציה */}
      <header
        className="py-8 px-8 text-center border-b border-[#e8e8e8] bg-white"
        style={{ paddingTop: 10, paddingBottom: 10 }}
      >
        <h1
          className="text-xl md:text-2xl font-bold text-[#6B584C]"
          style={{ opacity: 1, transform: 'none' }}
        >
          הנגריה הפתוחה
        </h1>
        <p className="text-[#464646]" style={{ marginTop: 0 }}>
          הזמנת סדנת נגרות
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="space-y-4">
          {sections.map((section) => {
            const isLocked = section.id > 1 && !completedSections.includes(section.id - 1);
            const isCompleted = completedSections.includes(section.id);
            const isActive = activeSection === section.id;

            return (
              <AccordionSection
                key={section.id}
                title={section.title}
                stepNumber={section.id}
                isActive={isActive}
                isCompleted={isCompleted}
                isLocked={isLocked}
                onClick={() => openSection(section.id)}
              >
                {section.id === 1 && (
                  <ParticipantsSection
                    participants={participants}
                    setParticipants={setParticipants}
                    onContinue={() => completeSection(1)}
                  />
                )}
                {section.id === 2 && (
                  <WoodTypeSection
                    woodType={woodType}
                    setWoodType={setWoodType}
                    onContinue={() => completeSection(2)}
                  />
                )}
                {section.id === 3 && (
                  <ProductSelectionSection
                    cart={cart}
                    setCart={setCart}
                    participants={participants}
                    woodType={woodType}
                    wixProducts={wixProducts}
                    updateQuantity={updateQuantity}
                    onContinue={() => completeSection(3)}
                  />
                )}
                {section.id === 4 && (
                  <TimeSlotsSection
                    selectedSlots={selectedSlots}
                    setSelectedSlots={setSelectedSlots}
                    totalMeetings={totalMeetings || 1}
                    availableSlots={wixSlots}
                    participants={participants}
                    onContinue={() => completeSection(4)}
                    continueLabel="המשך לפרטים אישיים"
                    isSubmitting={false}
                    timerActive={timerActive}
                    setTimerActive={setTimerActive}
                  />
                )}
                {section.id === 5 && (
                  <PersonalDetailsSection
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                    onContinue={handleSubmit}
                    isSubmitting={isProcessing}
                  />
                )}
              </AccordionSection>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      
      
      {/* הערה: FloatingSummary כעת ב-iframe נפרד בנתיב /summary */}
    </div>
  );
}