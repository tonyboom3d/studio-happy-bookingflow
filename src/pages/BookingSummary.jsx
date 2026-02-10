import React, { useState, useEffect } from 'react';
import FloatingSummary from '../components/booking/FloatingSummary';

/**
 * BookingSummary Page - דף נפרד לסיכום ההזמנה
 * דף זה מיועד להיות ב-iframe נפרד שיהיה sticky
 * הוא מקשיב להודעות מה-Wix VELO (parent) כדי לקבל את נתוני ההזמנה
 */
export default function BookingSummary() {
  const [summaryData, setSummaryData] = useState({
    participants: 1,
    woodType: '',
    cart: [],
    selectedSlots: [],
    totalMeetings: 0,
    activeSection: 1
  });

  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';

    const handleMessage = (event) => {
      // לוג דיבוג כדי לראות מה ה-iframe של הסיכום מקבל
      try {
        console.log('[BookingSummary iframe] window message:', {
          origin: event.origin,
          type: event?.data?.type,
          raw: event.data
        });
      } catch (e) {}

      if (event.data?.type === 'SUMMARY_UPDATE') {
        const data = event.data.data;
        setSummaryData({
          participants: data.participants || 1,
          woodType: data.woodType || '',
          cart: data.cart || [],
          selectedSlots: data.selectedSlots || [],
          totalMeetings: data.totalMeetings || 0,
          activeSection: data.activeSection || 1
        });
      }
      if (event.data?.type === 'CATALOG_STATE_CHANGE') {
        window.postMessage({
          type: 'CATALOG_STATE_CHANGE',
          data: event.data.data
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'SUMMARY_IFRAME_READY'
      }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      margin: 0, 
      padding: 0,
      overflow: 'hidden',
      background: 'transparent'
    }}>
      <FloatingSummary
        participants={summaryData.participants}
        woodType={summaryData.woodType}
        cart={summaryData.cart}
        selectedSlots={summaryData.selectedSlots}
        totalMeetings={summaryData.totalMeetings}
        activeSection={summaryData.activeSection}
        isSummaryPage={true}
      />
    </div>
  );
}
