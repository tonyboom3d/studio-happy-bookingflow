import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import OrganizerOrderHub from './OrganizerOrderHub';
import PhoneVerification from './PhoneVerification';
import SketchSelectionView from './SketchSelectionView';
import InvalidLinkMessage from './InvalidLinkMessage';
import OrderLoadError from './OrderLoadError';
import DeadlineCountdown from './DeadlineCountdown';

export default function PostPaymentHub({
  orderContext,
  ecomSummary,
  participantContext,
  role,
  catalog: initialCatalog,
  onSendMessage,
  isLoading,
  orderError,
}) {
  const [localOrder, setLocalOrder] = useState(orderContext?.order || null);
  const [localParticipants, setLocalParticipants] = useState(orderContext?.participants || []);
  const [localSelections, setLocalSelections] = useState(orderContext?.selections || []);
  const [participantLinks, setParticipantLinks] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [verifiedParticipant, setVerifiedParticipant] = useState(participantContext?.participant || null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [catalog, setCatalog] = useState(initialCatalog || null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const catalogFetchedRef = React.useRef(false);
  const paymentListenerRef = useRef(false);

  useEffect(() => {
    if (orderContext?.order) setLocalOrder(orderContext.order);
    if (orderContext?.participants) setLocalParticipants(orderContext.participants);
    if (orderContext?.selections) setLocalSelections(orderContext.selections);
  }, [orderContext]);

  useEffect(() => {
    if (participantContext?.participant) setVerifiedParticipant(participantContext.participant);
    if (participantContext?.selections) setLocalSelections(participantContext.selections);
  }, [participantContext]);

  useEffect(() => {
    if (initialCatalog?.length && !catalog?.length) setCatalog(initialCatalog);
  }, [initialCatalog]);

  const sendAndWait = useCallback((type, data) => {
    return new Promise((resolve) => {
      const handler = (response) => {
        resolve(response);
      };
      onSendMessage(type, data, handler);
    });
  }, [onSendMessage]);

  const handleFetchCatalog = useCallback(async () => {
    if (catalog?.length || catalogFetchedRef.current) return catalog;
    catalogFetchedRef.current = true;
    try {
      const result = await sendAndWait('FETCH_CATALOG', {});
      if (result?.products?.length) {
        setCatalog(result.products);
        return result.products;
      }
    } catch (e) {
      console.error('Failed to fetch catalog:', e);
      catalogFetchedRef.current = false;
    }
    return catalog;
  }, [catalog, sendAndWait]);

  const handleChooseMode = useCallback((mode) => {
    setLocalOrder(prev => ({ ...prev, selectionMode: mode }));
    sendAndWait('SET_SELECTION_MODE', { orderId: localOrder._id, mode }).catch(() => {
      setLocalOrder(prev => ({ ...prev, selectionMode: null }));
    });
  }, [localOrder?._id, sendAndWait]);

  const handleSaveParticipants = async (participants) => {
    setIsSaving(true);
    try {
      const result = await sendAndWait('SAVE_PARTICIPANTS', {
        orderId: localOrder._id,
        participants,
      });
      if (result?.participants) {
        setLocalParticipants(result.participants);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateLinks = async () => {
    setIsSaving(true);
    try {
      const result = await sendAndWait('GENERATE_PARTICIPANT_LINKS', {
        orderId: localOrder._id,
      });
      if (result?.links) {
        setParticipantLinks(result.links);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSketch = async (selection) => {
    setIsSaving(true);
    try {
      const result = await sendAndWait('SAVE_SKETCH_SELECTION', {
        orderId: localOrder._id,
        participantId: verifiedParticipant?._id || null,
        ...selection,
      });
      if (result?.selection) {
        setLocalSelections(prev => {
          const filtered = prev.filter(s =>
            !(s.rugIndex === selection.rugIndex &&
              (s.participantId || null) === (verifiedParticipant?._id || null))
          );
          return [...filtered, result.selection];
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (paymentListenerRef.current) return;
    paymentListenerRef.current = true;

    const handler = (event) => {
      const msg = event.data;
      if (!msg?.type) return;

      if (msg.type === 'UPGRADE_PAYMENT_STATUS') {
        setPaymentStatus(msg.status);
      }
      if (msg.type === 'UPGRADE_PAYMENT_RESULT') {
        if (msg.success) {
          if (msg.selections) setLocalSelections(msg.selections);
          setPaymentStatus('success');
          setTimeout(() => setPaymentStatus(null), 2500);
        } else if (msg.pending) {
          setPaymentStatus('pending');
          setTimeout(() => setPaymentStatus(null), 4000);
        } else {
          setPaymentStatus('failed');
          setTimeout(() => setPaymentStatus(null), 3000);
        }
        setIsSaving(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleRequestUpgrade = useCallback((upgradeSelections) => {
    const sels = Array.isArray(upgradeSelections) ? upgradeSelections : [upgradeSelections];
    if (!sels.length) return;
    setIsSaving(true);
    setPaymentStatus('creating');
    onSendMessage('REQUEST_UPGRADE_PAYMENT', {
      orderId: localOrder._id,
      selections: sels,
      orderNumber: ecomSummary?.orderNumber,
      buyerName: ecomSummary?.buyerName,
      buyerPhone: ecomSummary?.buyerPhone,
      buyerEmail: ecomSummary?.buyerEmail,
    });
  }, [localOrder?._id, ecomSummary, onSendMessage]);

  const handleUpdateSettings = async (settings) => {
    try {
      await sendAndWait('UPDATE_ORDER_SETTINGS', {
        orderId: localOrder._id,
        settings,
      });
      setLocalOrder(prev => ({ ...prev, ...settings }));
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  };

  const handlePhoneVerify = async (phone) => {
    setIsVerifying(true);
    try {
      onSendMessage('VERIFY_PARTICIPANT_PHONE', { phone });
    } finally {
      setTimeout(() => setIsVerifying(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#5E2F88] animate-spin" />
        <p className="mt-3 text-sm text-[#581E83]">טוען פרטי הזמנה...</p>
      </div>
    );
  }

  if (orderError && !localOrder) {
    return <OrderLoadError />;
  }

  if (!localOrder) {
    return <InvalidLinkMessage />;
  }

  const paymentOverlay = (
    <AnimatePresence>
      {paymentStatus && paymentStatus !== 'success' && paymentStatus !== 'failed' && paymentStatus !== 'pending' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95"
          dir="rtl"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          >
            <Loader2 className="w-12 h-12 text-[#5E2F88]" />
          </motion.div>
          <p className="mt-4 text-lg font-bold text-[#581E83]">
            {paymentStatus === 'creating' ? 'מכין תשלום...' : 'מעבד תשלום...'}
          </p>
          <p className="mt-2 text-sm text-[#464646]/70">אנא אל תסגרו את החלון</p>
        </motion.div>
      )}
      {paymentStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95"
          dir="rtl"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-lg font-bold text-green-700">התשלום בוצע בהצלחה!</p>
          <p className="mt-1 text-sm text-[#464646]/70">הבחירות נשמרו</p>
        </motion.div>
      )}
      {paymentStatus === 'pending' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95"
          dir="rtl"
        >
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="mt-4 text-lg font-bold text-orange-700">ממתין לאישור תשלום...</p>
          <p className="mt-1 text-sm text-[#464646]/70">הבחירות יישמרו עם אישור התשלום</p>
        </motion.div>
      )}
      {paymentStatus === 'failed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95"
          dir="rtl"
        >
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <p className="text-lg font-bold text-red-700">התשלום לא הושלם</p>
          <p className="mt-1 text-sm text-[#464646]/70">ניתן לנסות שוב</p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Organizer view
  if (role === 'organizer') {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {paymentOverlay}
        <OrganizerOrderHub
          order={localOrder}
          ecomSummary={ecomSummary}
          catalog={catalog}
          participants={localParticipants}
          selections={localSelections}
          participantLinks={participantLinks}
          onChooseMode={handleChooseMode}
          onSaveParticipants={handleSaveParticipants}
          onGenerateLinks={handleGenerateLinks}
          onSelectSketch={handleSelectSketch}
          onRequestUpgrade={handleRequestUpgrade}
          onUpdateSettings={handleUpdateSettings}
          onFetchCatalog={handleFetchCatalog}
          isSaving={isSaving}
        />
      </div>
    );
  }

  // Participant view — needs phone verification first
  if (role === 'participant' && !verifiedParticipant) {
    return (
      <PhoneVerification
        onVerified={handlePhoneVerify}
        isVerifying={isVerifying}
      />
    );
  }

  // Participant with verified access
  if (role === 'participant' && verifiedParticipant) {
    const rugSlots = Array.from(
      { length: verifiedParticipant.rugAllowance || 1 },
      (_, i) => ({
        rugIndex: i,
        participantName: verifiedParticipant.name,
      })
    );

    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6" dir="rtl">
        {paymentOverlay}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h2 className="text-xl font-bold text-[#581E83]">
            היי {verifiedParticipant.name}!
          </h2>
          <p className="text-sm text-[#464646]/70 mt-1">
            בחר/י את הסקיצה לשטיח שלך
          </p>
        </motion.div>

        <DeadlineCountdown
          deadlineAt={localOrder.deadlineAt}
          rugCount={verifiedParticipant.rugAllowance || 1}
          participantCount={1}
        />

        <SketchSelectionView
          rugSlots={rugSlots}
          catalog={catalog}
          workshopStart={localOrder.workshopStart}
          deadlineAt={localOrder.deadlineAt}
          totalRugCount={localOrder.rugCount}
          buyerName={ecomSummary?.buyerName}
          orderNumber={ecomSummary?.orderNumber}
          onSelectSketch={handleSelectSketch}
          onRequestUpgrade={handleRequestUpgrade}
          onFetchCatalog={handleFetchCatalog}
          existingSelections={localSelections}
        />
      </div>
    );
  }

  return <InvalidLinkMessage />;
}
