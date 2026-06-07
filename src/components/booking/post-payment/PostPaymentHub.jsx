import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  catalog,
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

  useEffect(() => {
    if (orderContext?.order) setLocalOrder(orderContext.order);
    if (orderContext?.participants) setLocalParticipants(orderContext.participants);
    if (orderContext?.selections) setLocalSelections(orderContext.selections);
  }, [orderContext]);

  useEffect(() => {
    if (participantContext?.participant) setVerifiedParticipant(participantContext.participant);
    if (participantContext?.selections) setLocalSelections(participantContext.selections);
  }, [participantContext]);

  const sendAndWait = useCallback((type, data) => {
    return new Promise((resolve) => {
      const handler = (response) => {
        resolve(response);
      };
      onSendMessage(type, data, handler);
    });
  }, [onSendMessage]);

  const handleChooseMode = async (mode) => {
    setIsSaving(true);
    try {
      const result = await sendAndWait('SET_SELECTION_MODE', { orderId: localOrder._id, mode });
      setLocalOrder(prev => ({ ...prev, selectionMode: mode }));
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleRequestUpgrade = async (selection) => {
    setIsSaving(true);
    try {
      await sendAndWait('SAVE_SKETCH_SELECTION', {
        orderId: localOrder._id,
        participantId: verifiedParticipant?._id || null,
        ...selection,
      });
      onSendMessage('REQUEST_UPGRADE_PAYMENT', {
        orderId: localOrder._id,
        selectionData: selection,
      });
    } finally {
      setIsSaving(false);
    }
  };

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

  // Organizer view
  if (role === 'organizer') {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
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
          onSelectSketch={handleSelectSketch}
          onRequestUpgrade={handleRequestUpgrade}
          existingSelections={localSelections}
        />
      </div>
    );
  }

  return <InvalidLinkMessage />;
}
