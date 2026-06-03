import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CreditCard } from 'lucide-react';
import AccordionSection from '../components/booking/AccordionSection';
import TimeSlotsSection from '../components/booking/TimeSlotsSection';
import ParticipantsSection from '../components/booking/ParticipantsSection';
import PersonalDetailsSection from '../components/booking/PersonalDetailsSection';
import OrderSummarySection from '../components/booking/OrderSummarySection';
import { submitBooking, subscribeToWix, notifyProgress, isWixEditorOrPreview } from '@/api/wixBridge';
import { addLog } from '@/components/VersionLogger';

export default function WorkshopBooking() {
  const navigate = useNavigate();

  // State ראשי
  const [activeSection, setActiveSection] = useState(1);
  const [completedSections, setCompletedSections] = useState([]);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [prevActiveSection, setPrevActiveSection] = useState(1);

  // נתוני ההזמנה — תאריך → משתתפים → פרטים אישיים
  const [selectedSlot, setSelectedSlot] = useState(null); // slot יחיד (לא מערך)
  const [adults, setAdults] = useState(1); // מבוגרים 14+
  const [children, setChildren] = useState(0); // ילדים 8-13
  const [userDetails, setUserDetails] = useState({ name: '', email: '', phone: '' });

  // נתונים מ-Wix
  const [wixProducts, setWixProducts] = useState(null);
  const [wixSlots, setWixSlots] = useState(null);
  const [pricingByService, setPricingByService] = useState(null);
  const [serviceMinPrices, setServiceMinPrices] = useState(null);

  // סטטוס
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('Successful');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  /** בעורך Wix — לא מציגים מסך טעינה מלא (מפריע לעריכה) */
  const skipInitialLoadingScreen = useMemo(() => isWixEditorOrPreview(), []);

  // טיימר מינימום 3 שניות לטעינה (מושבת כשמדלגים על מסך הטעינה)
  useEffect(() => {
    if (skipInitialLoadingScreen) {
      setMinTimeElapsed(true);
      return;
    }
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [skipInitialLoadingScreen]);

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
      if (data.pricingByService) {
        setPricingByService(data.pricingByService);
        addLog('Loaded pricing by service', 'success');
      }
      if (data.serviceMinPrices) {
        setServiceMinPrices(data.serviceMinPrices);
        addLog('Loaded service min prices', 'success');
      }
      if (data.bookingConfirmed) {
        setIsProcessing(false);
        setIsComplete(true);
        setPaymentStatus(data.paymentStatus || 'Successful');
        addLog(`Booking confirmed! Payment status: ${data.paymentStatus}`, 'success');

        if (data.orderData) {
          setBooking(prev => {
            if (prev) return prev;
            return {
              full_name: `${data.orderData.buyerInfo?.firstName || ''} ${data.orderData.buyerInfo?.lastName || ''}`.trim(),
              email: data.orderData.buyerInfo?.email || '',
              phone: data.orderData.buyerInfo?.phone || '',
              adults: 1,
              children: 0,
              carpetSizes: {},
              products: [],
              selectedSlot: null,
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
      if (data.orderContext) {
        addLog('Order context received, navigating to order hub', 'info');
        navigate('/order');
      }
      if (data.tokenAccess) {
        addLog('Token access detected, navigating to selection', 'info');
        navigate(`/select/${data.tokenAccess}`);
      }
    });

    return unsubscribe;
  }, [navigate]);

  // עדכון Wix על התקדמות
  useEffect(() => {
    addLog(`Active section changed to: ${activeSection}`, 'info');
    notifyProgress(activeSection, {
      adults,
      children,
      hasSelectedSlot: !!selectedSlot
    });
  }, [activeSection, adults, children, selectedSlot]);

  // פתיחה/סגירה אוטומטית של סיכום הזמנה
  useEffect(() => {
    if (activeSection === 3 && prevActiveSection !== 3) {
      setSummaryExpanded(true);
    }
    if (prevActiveSection === 3 && activeSection < 3) {
      setSummaryExpanded(false);
    }
    setPrevActiveSection(activeSection);
  }, [activeSection, prevActiveSection]);

  // חישוב מספר יחידות (מבוגר+ילד = יחידה אחת)
  const totalUnits = adults; // כל מבוגר = יחידה, ילדים מצטרפים להורה
  const parentChildPairs = Math.min(adults, children); // זוגות הורה+ילד
  const soloAdults = adults - parentChildPairs; // מבוגרים בלי ילד

  // מחיר בסיס לפי שירות ומספר מבוגרים + זוגות הורה+ילד
  const basePrice = useMemo(() => {
    if (!selectedSlot || !pricingByService) return 0;
    const servicePricing = pricingByService[selectedSlot.serviceId];
    if (!servicePricing) return 0;
    
    const pricePerAdult = servicePricing[1] || 250;
    const parentChildPrice = servicePricing.parentChild || pricePerAdult;
    
    // מחיר מבוגרים רגילים + מחיר זוגות הורה+ילד
    return (soloAdults * pricePerAdult) + (parentChildPairs * parentChildPrice);
  }, [selectedSlot, pricingByService, soloAdults, parentChildPairs]);

  const orderTotalPreview = basePrice;

  // מעבר לסקשן הבא
  const completeSection = (sectionNum) => {
    if (!completedSections.includes(sectionNum)) {
      setCompletedSections([...completedSections, sectionNum]);
    }
    setActiveSection(sectionNum + 1);
    addLog(`Section ${sectionNum} completed, moving to section ${sectionNum + 1}`, 'success');
  };

  const canOpenSection = (sectionNum) => {
    if (sectionNum === 4) return true;
    if (sectionNum <= activeSection) return true;
    if (completedSections.includes(sectionNum - 1)) return true;
    return false;
  };

  const openSection = (sectionNum) => {
    if (!canOpenSection(sectionNum)) return;
    setActiveSection(sectionNum);
  };

  // שליחת ההזמנה — מפעיל את תהליך ה-checkout ב-Wix
  const handleSubmit = async () => {
    setBookingError(null);
    addLog('Starting booking submission...', 'info');
    setCompletedSections((prev) => (prev.includes(3) ? prev : [...prev, 3]));
    setIsProcessing(true);

    const bookingData = {
      adults,
      children,
      selectedSlot: selectedSlot ? {
        slot_id: selectedSlot._id || selectedSlot.sessionId,
        date: selectedSlot.start?.timestamp,
        sessionId: selectedSlot.sessionId,
        serviceId: selectedSlot.serviceId,
        openSpots: selectedSlot.openSpots
      } : null,
      total_price: orderTotalPreview,
      userDetails: {
        name: userDetails.name?.trim() || '',
        email: userDetails.email?.trim() || '',
        phone: userDetails.phone?.trim() || ''
      }
    };

    console.log('[Booking][Frontend] bookingData being sent to Wix:', JSON.stringify(bookingData, null, 2));

    addLog('Submitting booking', 'info');
    submitBooking(bookingData);

    setTimeout(() => {
      setIsProcessing(prev => {
        if (!prev) return prev;
        setBookingError(prevError => prevError || 'timeout');
        return false;
      });
    }, 60000);
  };

  // מסך טעינה ראשוני
  if (!skipInitialLoadingScreen && (!minTimeElapsed || wixSlots == null)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {/* לוגו עם טבעת סיבוב */}
          <div className="relative flex items-center justify-center">
            {/* טבעת חיצונית מסתובבת */}
            <div className="w-28 h-28 rounded-full border-4 border-[#e8e8e8] border-t-[#5E2F88] animate-spin absolute" />
            {/* תמונת לוגו במרכז */}
            <img
              src="https://static.wixstatic.com/media/6b73e9_6e7c52763bb24ba6812aaac51ecb4296~mv2.png"
              alt="סטודיו האפי"
              className="w-14 h-14 object-contain rounded-full"
            />
          </div>

          {/* מרווח בין האנימציה לטקסט */}
          <p className="text-lg font-semibold text-[#581E83] tracking-wide mt-8">
            טוען סדנת טאפטינג
          </p>
        </motion.div>
      </div>
    );
  }

  // אם ההזמנה הושלמה — ניווט אוטומטי לדף ההזמנה (post-payment)
  // ORDER_CONTEXT יגיע מהדף ויעביר ל-/order, כאן מציגים מסך ביניים
  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-full bg-[#5E2F88] flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[#581E83]">
            ההזמנה בוצעה בהצלחה!
          </p>
          <p className="text-sm text-[#464646]/70 mt-2">
            טוען את מסך בחירת הסקיצות...
          </p>
        </motion.div>
      </div>
    );
  }

  // מסך עיבוד
  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="w-12 h-12 text-[#5E2F88] animate-spin" />
        <p className="mt-4 text-lg text-[#581E83]">דף התשלום נטען, כמה רגעים...</p>
      </div>
    );
  }

  const sections = [
    { id: 1, title: 'בחירת תאריך' },
    { id: 2, title: 'כמה תהיו ?' },
    { id: 3, title: 'פרטים אישיים' },
    { id: 4, title: 'סיכום הזמנה' }
  ];

  return (
    <div className="min-h-screen bg-transparent" dir="rtl">
      {/* Header */}
      <header
        className="py-8 px-8 text-center border-b border-[#e8e8e8] bg-transparent"
        style={{ paddingTop: 10, paddingBottom: 10 }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#581E83] hover:text-[#7B3DB0] transition-colors"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
            חזרה לדף הקודם
          </button>
          <div className="w-[1px]" aria-hidden />
        </div>
        <h1
          className="text-xl md:text-2xl font-bold text-[#581E83]"
          style={{ opacity: 1, transform: 'none' }}
        >
          סטודיו האפי
        </h1>
        <p className="text-[#464646]" style={{ marginTop: 0 }}>
          הזמנת סדנת טאפטינג
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="space-y-4">
          {sections.map((section) => {
            const isLocked =
              section.id === 4
                ? false
                : section.id > 1 && !completedSections.includes(section.id - 1);
            const isCompleted = completedSections.includes(section.id);
            const isActive = section.id === 4 ? summaryExpanded : activeSection === section.id;

            const headerRight =
              section.id === 4 ? (
                <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-white">
                  <CreditCard className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                  ₪{Math.round(orderTotalPreview)}
                </span>
              ) : null;

            const handleSectionClick = () => {
              if (section.id === 4) {
                setSummaryExpanded(!summaryExpanded);
              } else {
                openSection(section.id);
              }
            };

            return (
              <AccordionSection
                key={section.id}
                title={section.title}
                headerRight={headerRight}
                variant={section.id === 4 ? 'summary' : 'default'}
                stepNumber={section.id}
                isActive={isActive}
                isCompleted={isCompleted}
                isLocked={isLocked}
                onClick={handleSectionClick}
              >
                {section.id === 1 && (
                  <TimeSlotsSection
                    selectedSlot={selectedSlot}
                    setSelectedSlot={setSelectedSlot}
                    availableSlots={wixSlots}
                    pricingByService={pricingByService}
                    serviceMinPrices={serviceMinPrices}
                    onContinue={() => completeSection(1)}
                  />
                )}
                {section.id === 2 && (
                  <ParticipantsSection
                    adults={adults}
                    setAdults={setAdults}
                    children={children}
                    setChildren={setChildren}
                    maxParticipants={selectedSlot?.openSpots || 10}
                    pricingByService={pricingByService}
                    selectedSlot={selectedSlot}
                    onContinue={() => completeSection(2)}
                  />
                )}
                {section.id === 3 && (
                  <PersonalDetailsSection
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                    onPay={handleSubmit}
                    isSubmitting={isProcessing}
                  />
                )}
                {section.id === 4 && (
                  <OrderSummarySection
                    adults={adults}
                    children={children}
                    selectedSlot={selectedSlot}
                    basePrice={basePrice}
                    totalPrice={orderTotalPreview}
                  />
                )}
              </AccordionSection>
            );
          })}
        </div>
      </main>
    </div>
  );
}
