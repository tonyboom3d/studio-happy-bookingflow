/**
 * Wix Bridge - Communication layer with Wix Custom Element
 * 
 * This module handles bidirectional communication between
 * the React booking app (embedded in iframe) and the Wix parent page.
 * 
 * Communication patterns:
 * - FROM Wix: window.addEventListener('message', ...) receives data
 * - TO Wix: window.parent.postMessage(...) sends data
 * 
 * Performance optimizations:
 * - Origin validation לאבטחה ולמניעת עיבוד הודעות מיותרות
 * - Debounce לשליחת summary updates למניעת עומס
 */

// Store for received data from Wix
let wixData = {
    products: null,
    slots: null,
    initialized: false
};

// Callbacks for data updates
const listeners = new Set();

// רשימת origins מותרים
const ALLOWED_ORIGINS = [
    'https://www.kan-bonim.co.il',
    'https://kan-bonim.co.il',
    'https://editor.wix.com',
    'https://manage.wix.com',
    'https://www.wix.com',
    // GitHub Pages (האפליקציה עצמה)
    'https://tonyboom3d.github.io',
    // Wix iframes
    'https://static.parastorage.com',
    'https://www.wixstatic.com',
    // null origin (לפעמים מופיע מ-iframes)
    'null'
];

// Debounce timer לשליחת summary
let summaryDebounceTimer = null;
const SUMMARY_DEBOUNCE_DELAY = 300; // 300ms

/**
 * בדיקה אם ה-origin מותר
 */
function isAllowedOrigin(origin) {
    // בפיתוח - להתיר הכל
    const isDev = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.protocol === 'file:');
    
    if (isDev) return true;
    
    // אם אין origin (null או undefined) - יכול להיות מ-Wix iframe
    if (!origin || origin === 'null') return true;
    
    // בדיקה אם ה-origin ברשימת המותרים
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

/**
 * Initialize communication with Wix
 */
export function initWixBridge() {
    window.addEventListener('message', handleWixMessage);

    // Request initial data from Wix
    requestDataFromWix();
}

/**
 * Handle incoming messages from Wix
 * עם origin validation לאבטחה וביצועים
 */
function handleWixMessage(event) {
    // Origin validation - יציאה מוקדמת אם לא מותר
    if (!isAllowedOrigin(event.origin)) {
        return;
    }

    const { data } = event;

    // יציאה מוקדמת אם אין type
    if (!data || !data.type) return;

    // טיפול רק ב-types שאנחנו מכירים
    switch (data.type) {
        case 'WIX_DATA':
            // Wix sent products/slots data
            if (data.products) wixData.products = data.products;
            if (data.slots) wixData.slots = data.slots;
            wixData.initialized = true;
            notifyListeners();
            break;

        case 'WIX_PRODUCTS':
            wixData.products = data.products;
            notifyListeners();
            break;

        case 'WIX_SLOTS':
            wixData.slots = data.slots;
            notifyListeners();
            break;

        case 'BOOKING_CONFIRMED':
            // Wix confirmed booking was saved
            notifyListeners({ 
                bookingConfirmed: true, 
                bookingId: data.bookingId,
                paymentStatus: data.paymentStatus || 'Successful'
            });
            break;

        case 'BOOKING_ERROR':
            // Booking failed
            notifyListeners({ bookingError: data.error });
            break;

        // התעלמות מ-types לא מוכרים
        default:
            break;
    }
}

/**
 * Subscribe to data updates from Wix
 */
export function subscribeToWix(callback) {
    listeners.add(callback);

    // Immediately notify with current data if available
    if (wixData.initialized) {
        callback(wixData);
    }

    // Return unsubscribe function
    return () => listeners.delete(callback);
}

/**
 * Notify all listeners of data changes
 */
function notifyListeners(extra = {}) {
    const payload = { ...wixData, ...extra };
    listeners.forEach(callback => callback(payload));
}

/**
 * Request data (products, slots) from Wix
 */
export function requestDataFromWix() {
    sendToWix('REQUEST_DATA', {});
}

/**
 * Submit booking to Wix
 */
export function submitBooking(bookingData) {
    sendToWix('BOOKING_SUBMIT', bookingData);
}

/**
 * Notify Wix of user progress through the booking flow
 */
export function notifyProgress(section, data = {}) {
    sendToWix('BOOKING_PROGRESS', { section, ...data });
}

/**
 * Send a message to Wix parent
 */
function sendToWix(type, data) {
    try {
        window.parent.postMessage({ type, data }, '*');
    } catch (error) {}
}

/**
 * Get current cached data from Wix
 */
export function getWixData() {
    return { ...wixData };
}

/**
 * Check if we're running inside a Wix iframe
 */
export function isInWix() {
    try {
        return window.self !== window.parent;
    } catch (e) {
        return true; // Cross-origin restriction means we're in iframe
    }
}

/**
 * Send summary data to Wix for the external booking-summary Custom Element
 * עם Debounce למניעת שליחות מיותרות
 */
export function sendSummaryUpdate(summaryData) {
    // ביטול טיימר קודם אם קיים
    if (summaryDebounceTimer) {
        clearTimeout(summaryDebounceTimer);
    }
    
    // Debounce - המתנה לפני שליחה
    summaryDebounceTimer = setTimeout(() => {
        sendToWix('SUMMARY_UPDATE', summaryData);
        summaryDebounceTimer = null;
    }, SUMMARY_DEBOUNCE_DELAY);
}
