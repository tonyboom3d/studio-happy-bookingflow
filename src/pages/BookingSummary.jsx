import React, { useState, useEffect } from 'react';
import FloatingSummary from '../components/booking/FloatingSummary';
import { addLog } from '@/components/VersionLogger';

/**
 * BookingSummary Page - דף נפרד לסיכום ההזמנה
 * דף זה מיועד להיות ב-iframe נפרד שיהיה sticky
 * הוא מקשיב להודעות מה-iframe הראשי כדי לקבל את נתוני ההזמנה
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
    addLog('BookingSummary page loaded', 'success');

    // האזנה להודעות מה-iframe הראשי (parent window)
    const handleMessage = (event) => {
      // וידוא שההודעה מגיעה מה-iframe הראשי
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
        addLog('Summary data updated from parent', 'success');
      }

      // האזנה למצב הקטלוג
      if (event.data?.type === 'CATALOG_STATE_CHANGE') {
        // נשלח ל-FloatingSummary דרך postMessage פנימי
        window.postMessage({
          type: 'CATALOG_STATE_CHANGE',
          data: event.data.data
        }, '*');
      }
    };

    // האזנה ל-message events
    window.addEventListener('message', handleMessage);

    // שליחת הודעה ל-parent שאנחנו מוכנים
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'SUMMARY_IFRAME_READY'
      }, '*');
      addLog('Sent ready message to parent', 'info');
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
      />
    </div>
  );
}
