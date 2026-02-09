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
import { addLog } from '@/components/VersionLogger';

export default function WorkshopBooking() {
  // State ראשי
  const [activeSection, setActiveSection] = useState(1);
  const [completedSections, setCompletedSections] = useState([]);

  // נתוני ההזמנה
  const [participants, setParticipants] = useState(1);
  const [woodType, setWoodType] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [userDetails, setUserDetails] = useState({});

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
        // Wix confirmed booking saved
        setIsProcessing(false);
        setIsComplete(true);
        setPaymentStatus(data.paymentStatus || 'Successful');
        addLog(`Booking confirmed! Payment status: ${data.paymentStatus}`, 'success');
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

  // עדכון כמות מוצר בעגלה (מינימום 1, מקסימום 5)
  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(p => {
      const pid = p._id || p.id;
      if (pid === productId) {
        const newQty = Math.min(5, Math.max(1, (p.quantity || 1) + delta));
        return { ...p, quantity: newQty };
      }
      return p;
    }));
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
      activeSection
    };
    
    // שליחה ל-Wix VELO דרך window.parent.postMessage
    // Wix VELO יעביר את הנתונים ל-summary iframe (htmlComponent2)
    sendSummaryUpdate(summaryData);
  }, [participants, woodType, cart, selectedSlots, totalMeetings, activeSection]);

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

  // שליחת ההזמנה
  const handleSubmit = async () => {
    setBookingError(null);
    addLog('Starting booking submission...', 'info');
    setIsProcessing(true);

    const bookingData = {
      full_name: userDetails.full_name,
      email: userDetails.email,
      phone: userDetails.phone,
      participants,
      wood_type: woodType,
      products: cart.map(p => ({ product_id: p.id, _id: p._id || p.id, title: p.title, price: p.price, quantity: p.quantity || 1, addOnId: p.addOnId })),
      selected_slots: selectedSlots.map(s => ({
        slot_id: s.id,
        date: s.date?.toISOString?.() || s.date,
        time: s.time,
        // sessionId חיוני לביצוע ההזמנה ב-Wix Bookings API
        sessionId: s.sessionId || null
      })),
      total_price: cart.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0),
      total_sessions: totalMeetings,
      notes: userDetails.notes,
      instagram: userDetails.instagram,
      marketing_consent: userDetails.marketing_consent,
      status: 'pending'
    };

    // שליחה ל-Wix דרך postMessage
    addLog(`Submitting booking with ${cart.length} products, ${selectedSlots.length} slots`, 'info');
    submitBooking(bookingData);

    // אם לא מקבלים תגובה מ-Wix תוך 10 שניות, נניח שהצליח
    setTimeout(() => {
      if (isProcessing) {
        setBooking(bookingData);
        setIsProcessing(false);
        setIsComplete(true);
      }
    }, 10000);
  };

  // מסך טעינה ראשוני
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-4 border-[#e8e8e8] border-t-[#ADC178] rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#ADC178] animate-pulse" />
            </div>
          </div>
          <motion.h2
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-bold text-[#6B584C]"
          >
            הנגריה הפתוחה
          </motion.h2>
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
          setUserDetails({});
          setBooking(null);
          setPaymentStatus('Successful');
        }}
      />
    );
  }

  // מסך עיבוד
  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-[#ADC178]" />
        </motion.div>
        <p className="mt-4 text-lg text-[#6B584C]">שומר את ההזמנה...</p>
      </div>
    );
  }

  const sections = [
    { id: 1, title: 'כמה תיהיו?' },
    { id: 2, title: 'סוג העץ' },
    { id: 3, title: 'מה בונים?' },
    { id: 4, title: 'בחירת תאריכים' },
    { id: 5, title: 'פרטים אישיים' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafafa]" dir="rtl">
      {/* Header */}
      <header className="py-8 px-8 text-center border-b border-[#e8e8e8] bg-white">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-bold text-[#6B584C]"
        >
          הנגריה הפתוחה
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-[#464646]"
        >
          הזמנת סדנת נגרות
        </motion.p>
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
                    timerActive={timerActive}
                    setTimerActive={setTimerActive}
                  />
                )}
                {section.id === 5 && (
                  <PersonalDetailsSection
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                    onSubmit={handleSubmit}
                    isSubmitting={isProcessing}
                    bookingError={bookingError}
                    onClearError={() => setBookingError(null)}
                  />
                )}
              </AccordionSection>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 pb-32 md:pb-6 text-center text-sm text-[#464646]/60">
        © 2024 הנגריה הפתוחה. כל הזכויות שמורות.
      </footer>
      
      {/* הערה: FloatingSummary כעת ב-iframe נפרד בנתיב /summary */}
    </div>
  );
}