import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CreditCard } from 'lucide-react';
import AccordionSection from '../components/booking/AccordionSection';
import TimeSlotsSection from '../components/booking/TimeSlotsSection';
import ParticipantsSection from '../components/booking/ParticipantsSection';
import CarpetSizeSection from '../components/booking/CarpetSizeSection';
import ProductSelectionSection from '../components/booking/ProductSelectionSection';
import PersonalDetailsSection from '../components/booking/PersonalDetailsSection';
import OrderSummarySection from '../components/booking/OrderSummarySection';
import ThankYouScreen from '../components/booking/ThankYouScreen';
import { submitBooking, subscribeToWix, notifyProgress, isWixEditorOrPreview } from '@/api/wixBridge';
import { computeOrderSummary } from '@/components/booking/FloatingSummary';
import { addLog, APP_VERSION } from '@/components/VersionLogger';

export default function WorkshopBooking() {
  // State ראשי
  const [activeSection, setActiveSection] = useState(1);
  const [completedSections, setCompletedSections] = useState([]);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [prevActiveSection, setPrevActiveSection] = useState(1);

  // נתוני ההזמנה — סדר חדש: תאריך → משתתפים → גודל שטיח → עיצוב → פרטים
  const [selectedSlot, setSelectedSlot] = useState(null); // slot יחיד (לא מערך)
  const [adults, setAdults] = useState(1); // מבוגרים 14+
  const [children, setChildren] = useState(0); // ילדים 8-13
  const [carpetSizes, setCarpetSizes] = useState({}); // { 0: '60x60', 1: '90x90' } לפי אינדקס מבוגר
  const [cart, setCart] = useState([]);
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
    });

    return unsubscribe;
  }, []);

  // עדכון Wix על התקדמות
  useEffect(() => {
    addLog(`Active section changed to: ${activeSection}`, 'info');
    notifyProgress(activeSection, {
      adults,
      children,
      hasSelectedSlot: !!selectedSlot,
      cartCount: cart.length
    });
  }, [activeSection, adults, children, selectedSlot, cart.length]);

  // פתיחה/סגירה אוטומטית של סיכום הזמנה
  useEffect(() => {
    // כשמגיעים לשלב 5 (פרטים אישיים) - פותחים את הסיכום
    if (activeSection === 5 && prevActiveSection !== 5) {
      setSummaryExpanded(true);
    }
    // כשיורדים משלב 5 - סוגרים את הסיכום
    if (prevActiveSection === 5 && activeSection < 5) {
      setSummaryExpanded(false);
    }
    setPrevActiveSection(activeSection);
  }, [activeSection, prevActiveSection]);

  // חישוב מספר יחידות (מבוגר+ילד = יחידה אחת)
  const totalUnits = adults; // כל מבוגר = יחידה, ילדים מצטרפים להורה
  const parentChildPairs = Math.min(adults, children); // זוגות הורה+ילד
  const soloAdults = adults - parentChildPairs; // מבוגרים בלי ילד

  // חישוב תוספת מחיר עבור שטיחים 90x90
  const carpetSizeUpgradePrice = useMemo(() => {
    const upgradeCount = Object.values(carpetSizes).filter(s => s === '90x90').length;
    return upgradeCount * 100;
  }, [carpetSizes]);

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

  const orderTotalPreview = useMemo(
    () => basePrice + carpetSizeUpgradePrice,
    [basePrice, carpetSizeUpgradePrice]
  );

  // מעבר לסקשן הבא
  const completeSection = (sectionNum) => {
    if (!completedSections.includes(sectionNum)) {
      setCompletedSections([...completedSections, sectionNum]);
    }
    setActiveSection(sectionNum + 1);
    addLog(`Section ${sectionNum} completed, moving to section ${sectionNum + 1}`, 'success');
  };

  /** סיכום הזמנה (6) — ניתן לפתוח בכל עת */
  const canOpenSection = (sectionNum) => {
    if (sectionNum === 6) return true;
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
    setCompletedSections((prev) => (prev.includes(5) ? prev : [...prev, 5]));
    setIsProcessing(true);

    const bookingData = {
      adults,
      children,
      carpetSizes,
      products: cart.map(p => ({ 
        product_id: p.id, 
        _id: p._id || p.id, 
        title: p.title, 
        price: p.price, 
        quantity: p.quantity || 1, 
        addOnId: p.addOnId 
      })),
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

    addLog(`Submitting booking with ${cart.length} products`, 'info');
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
          setSelectedSlot(null);
          setAdults(1);
          setChildren(0);
          setCarpetSizes({});
          setCart([]);
          setUserDetails({ name: '', email: '', phone: '' });
          setBooking(null);
          setPaymentStatus('Successful');
        }}
      />
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

  // סדר חדש של הטאבים
  const sections = [
    { id: 1, title: 'בחירת תאריך' },
    { id: 2, title: 'כמה תהיו ?' },
    { id: 3, title: 'גודל שטיח' },
    { id: 4, title: 'בחירת עיצוב' },
    { id: 5, title: 'פרטים אישיים' },
    { id: 6, title: 'סיכום הזמנה' }
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
              section.id === 6
                ? false
                : section.id > 1 && !completedSections.includes(section.id - 1);
            const isCompleted = completedSections.includes(section.id);
            // סקשן 6 (סיכום) - נשלט ע״י summaryExpanded
            const isActive = section.id === 6 ? summaryExpanded : activeSection === section.id;

            const headerRight =
              section.id === 6 ? (
                <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-white">
                  <CreditCard className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                  ₪{Math.round(orderTotalPreview)}
                </span>
              ) : null;

            const handleSectionClick = () => {
              if (section.id === 6) {
                // סיכום - טוגל פתיחה/סגירה
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
                variant={section.id === 6 ? 'summary' : 'default'}
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
                  <CarpetSizeSection
                    adults={adults}
                    children={children}
                    carpetSizes={carpetSizes}
                    setCarpetSizes={setCarpetSizes}
                    onContinue={() => completeSection(3)}
                  />
                )}
                {section.id === 4 && (
                  <ProductSelectionSection
                    cart={cart}
                    setCart={setCart}
                    adults={adults}
                    children={children}
                    carpetSizes={carpetSizes}
                    wixProducts={wixProducts}
                    onContinue={() => completeSection(4)}
                    updateQuantity={(productId, delta) => {
                      setCart(prevCart => {
                        const totalItems = prevCart.reduce((sum, p) => sum + (p.quantity || 1), 0);
                        return prevCart.map(p => {
                          if ((p._id || p.id) !== productId) return p;
                          const newQty = (p.quantity || 1) + delta;
                          if (newQty < 1) return null;
                          if (delta > 0 && totalItems >= adults) return p;
                          return { ...p, quantity: newQty };
                        }).filter(Boolean);
                      });
                    }}
                  />
                )}
                {section.id === 5 && (
                  <PersonalDetailsSection
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                    onPay={handleSubmit}
                    isSubmitting={isProcessing}
                  />
                )}
                {section.id === 6 && (
                  <OrderSummarySection
                    adults={adults}
                    children={children}
                    carpetSizes={carpetSizes}
                    cart={cart}
                    selectedSlot={selectedSlot}
                    basePrice={basePrice}
                    carpetSizeUpgradePrice={carpetSizeUpgradePrice}
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
