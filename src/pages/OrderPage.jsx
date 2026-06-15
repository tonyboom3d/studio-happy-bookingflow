import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PostPaymentHub from '@/components/booking/post-payment/PostPaymentHub';
import {
  subscribeToWix,
  sendWithCallback,
  requestOrderContext,
  verifyParticipantAccess,
  getWixData,
  notifyIframeReady,
  isInWix,
} from '@/api/wixBridge';

export default function OrderPage() {
  const { token } = useParams();
  const [role, setRole] = useState(token ? 'participant' : 'organizer');
  const [orderContext, setOrderContext] = useState(null);
  const [ecomSummary, setEcomSummary] = useState(null);
  const [participantContext, setParticipantContext] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderError, setOrderError] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [accessToken, setAccessToken] = useState(token || null);

  useEffect(() => {
    const cached = getWixData();
    if (cached.products) setCatalog(cached.products);
    if (cached.orderContext) {
      setOrderContext(cached.orderContext);
      setRole(cached.orderRole || 'organizer');
      if (cached.ecomSummary) setEcomSummary(cached.ecomSummary);
      setIsLoading(false);
    }

    const unsubscribe = subscribeToWix((data) => {
      if (data.products) setCatalog(data.products);

      if (data.orderError) {
        setOrderError(true);
        setIsLoading(false);
        return;
      }

      if (data.orderContext) {
        setOrderError(false);
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
        setAccessToken(data.tokenAccess);
        if (data.groupInfo) setGroupInfo(data.groupInfo);
        setIsLoading(false);
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

    if (isInWix()) {
      notifyIframeReady();
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
      <PostPaymentHub
        orderContext={orderContext}
        ecomSummary={ecomSummary}
        participantContext={participantContext}
        role={role}
        accessToken={accessToken}
        catalog={catalog || []}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        orderError={orderError}
        groupInfo={groupInfo}
      />
    </div>
  );
}
