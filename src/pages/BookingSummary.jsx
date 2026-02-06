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
    console.log('[Summary] BookingSummary page loaded');

    // הגדרת רקע שקוף לגוף הדף
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';

    // האזנה להודעות מ-Wix VELO (parent window)
    const handleMessage = (event) => {
      console.log('[Summary] Received message:', event.data?.type);
      
      // עדכון נתוני הסיכום
      if (event.data?.type === 'SUMMARY_UPDATE') {
        const data = event.data.data;
        console.log('[Summary] Updating summary data:', data);
        setSummaryData({
          participants: data.participants || 1,
          woodType: data.woodType || '',
          cart: data.cart || [],
          selectedSlots: data.selectedSlots || [],
          totalMeetings: data.totalMeetings || 0,
          activeSection: data.activeSection || 1
        });
      }

      // האזנה למצב הקטלוג
      if (event.data?.type === 'CATALOG_STATE_CHANGE') {
        console.log('[Summary] Catalog state changed:', event.data.data?.isOpen);
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
      console.log('[Summary] Sent ready message to parent');
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
