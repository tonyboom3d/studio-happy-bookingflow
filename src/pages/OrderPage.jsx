import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PostPaymentHub from '@/components/booking/post-payment/PostPaymentHub';
import {
  subscribeToWix,
  sendWithCallback,
  requestOrderContext,
  verifyParticipantAccess,
  getWixData,
} from '@/api/wixBridge';

export default function OrderPage() {
  const { token } = useParams();
  const [role, setRole] = useState(token ? 'participant' : 'organizer');
  const [orderContext, setOrderContext] = useState(null);
  const [ecomSummary, setEcomSummary] = useState(null);
  const [participantContext, setParticipantContext] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = getWixData();
    if (cached.products) setCatalog(cached.products);

    const unsubscribe = subscribeToWix((data) => {
      if (data.products) setCatalog(data.products);

      if (data.orderContext) {
        setOrderContext(data.orderContext);
        setRole(data.role || 'organizer');
        if (data.ecomSummary) setEcomSummary(data.ecomSummary);
        setIsLoading(false);
        if (data.orderContext?.order?._id) {
          try { sessionStorage.setItem('workshop_order_id', data.orderContext.order._id); } catch (e) {}
        }
      }

      if (data.participantContext) {
        if (data.participantContext.valid === false) {
          setIsLoading(false);
          return;
        }
        setParticipantContext(data.participantContext);
        setRole('participant');
        setIsLoading(false);
      }

      if (data.tokenAccess) {
        setRole('participant');
      }
    });

    if (token) {
      verifyParticipantAccess(token, '');
    } else {
      const sessionOrderId = sessionStorage.getItem('workshop_order_id');
      if (sessionOrderId) {
        requestOrderContext({ orderId: sessionOrderId });
      }
    }

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [token]);

  const handleSendMessage = useCallback((type, data, callback) => {
    if (callback) {
      sendWithCallback(type, data, callback);
    } else {
      try {
        window.parent.postMessage({ type, data }, '*');
      } catch (e) {}
    }
  }, []);

  return (
    <div className="min-h-screen bg-transparent" dir="rtl">
      <header
        className="py-2 px-4 text-center border-b border-[#e8e8e8] bg-transparent"
      >
        <h1 className="text-lg font-bold text-[#581E83]">סטודיו האפי</h1>
        <p className="text-xs text-[#464646]/60">ניהול הזמנה ובחירת סקיצות</p>
      </header>

      <PostPaymentHub
        orderContext={orderContext}
        ecomSummary={ecomSummary}
        participantContext={participantContext}
        role={role}
        catalog={catalog || []}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
