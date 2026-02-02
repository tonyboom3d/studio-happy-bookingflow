import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import AccordionSection from '../components/booking/AccordionSection';
import ParticipantsSection from '../components/booking/ParticipantsSection';
import WoodTypeSection from '../components/booking/WoodTypeSection';
import ProductsSection from '../components/booking/ProductsSection';
import TimeSlotsSection from '../components/booking/TimeSlotsSection';
import PersonalDetailsSection from '../components/booking/PersonalDetailsSection';
import ThankYouScreen from '../components/booking/ThankYouScreen';
import { base44 } from '@/api/base44Client';

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
  
  // סטטוס
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [booking, setBooking] = useState(null);

  // חישוב סה"כ מפגשים
  const totalMeetings = cart.reduce((sum, p) => sum + (p.meetings || 3), 0);

  // מעבר לסקשן הבא
  const completeSection = (sectionNum) => {
    if (!completedSections.includes(sectionNum)) {
      setCompletedSections([...completedSections, sectionNum]);
    }
    setActiveSection(sectionNum + 1);
  };

  // פתיחת סקשן
  const openSection = (sectionNum) => {
    if (sectionNum <= activeSection || completedSections.includes(sectionNum - 1)) {
      setActiveSection(sectionNum);
    }
  };

  // שליחת ההזמנה
  const handleSubmit = async () => {
    setIsProcessing(true);
    
    const bookingData = {
      full_name: userDetails.full_name,
      email: userDetails.email,
      phone: userDetails.phone,
      participants,
      wood_type: woodType,
      products: cart.map(p => ({ product_id: p.id, title: p.title, price: p.price })),
      selected_slots: selectedSlots.map(s => ({ 
        slot_id: s.id, 
        date: s.date.toISOString(), 
        time: s.time 
      })),
      total_price: cart.reduce((sum, p) => sum + p.price, 0),
      total_sessions: totalMeetings,
      notes: userDetails.notes,
      instagram: userDetails.instagram,
      marketing_consent: userDetails.marketing_consent,
      status: 'pending'
    };

    const created = await base44.entities.Booking.create(bookingData);
    
    // סימולציה של תשלום
    setTimeout(() => {
      setBooking({ ...bookingData, id: created.id });
      setIsProcessing(false);
      setIsComplete(true);
    }, 1500);
  };

  // אם ההזמנה הושלמה
  if (isComplete) {
    return (
      <ThankYouScreen 
        booking={booking} 
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
        <p className="mt-4 text-lg text-[#6B584C]">מעביר לתשלום מאובטח...</p>
      </div>
    );
  }

  const sections = [
    { id: 1, title: 'כמה נגרים?' },
    { id: 2, title: 'סוג העץ' },
    { id: 3, title: 'מה בונים?' },
    { id: 4, title: 'בחירת תאריכים' },
    { id: 5, title: 'פרטים אישיים' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafafa]" dir="rtl">
      {/* Header */}
      <header className="py-8 px-4 text-center border-b border-[#e8e8e8] bg-white">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold text-[#6B584C]"
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
                  <ProductsSection
                    cart={cart}
                    setCart={setCart}
                    participants={participants}
                    woodType={woodType}
                    onContinue={() => completeSection(3)}
                  />
                )}
                {section.id === 4 && (
                  <TimeSlotsSection
                    selectedSlots={selectedSlots}
                    setSelectedSlots={setSelectedSlots}
                    totalMeetings={totalMeetings || 1}
                    onContinue={() => completeSection(4)}
                  />
                )}
                {section.id === 5 && (
                  <PersonalDetailsSection
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                    onSubmit={handleSubmit}
                    isSubmitting={isProcessing}
                  />
                )}
              </AccordionSection>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-[#464646]/60">
        © 2024 הנגריה הפתוחה. כל הזכויות שמורות.
      </footer>
    </div>
  );
}