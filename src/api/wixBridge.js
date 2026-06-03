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
    serviceMinPrices: null,
    initialized: false
};

// Pending response callbacks for request-reply pattern
const pendingCallbacks = new Map();
let callbackIdCounter = 0;

// Callbacks for data updates
const listeners = new Set();

// רשימת origins מותרים
const ALLOWED_ORIGINS = [
    // Studio Happy
    'https://www.studiohappy.art',
    'https://studiohappy.art',
    // Wix Editor & Management
    'https://editor.wix.com',
    'https://manage.wix.com',
    'https://www.wix.com',
    // GitHub Pages (האפליקציה עצמה)
    'https://tonyboom3d.github.io',
    // Wix iframes & static
    'https://static.parastorage.com',
    'https://www.wixstatic.com',
    // Wix hosting domains
    'https://www.wixsite.com',
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
    
    // כל דומיין Wix מותר
    if (origin.includes('.wix.com') || origin.includes('.wixsite.com') || 
        origin.includes('.wixstatic.com') || origin.includes('.parastorage.com')) {
        return true;
    }
    
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

        case 'SERVICE_MIN_PRICES':
            // עדכון מחירי מינימום משירותי Wix (לא חוסם)
            wixData.serviceMinPrices = data.serviceMinPrices || {};
            notifyListeners();
            break;

        case 'BOOKING_CONFIRMED':
            // Wix confirmed booking was saved (legacy Wix Pay flow)
            notifyListeners({ 
                bookingConfirmed: true, 
                bookingId: data.bookingId,
                paymentStatus: data.paymentStatus || 'Successful'
            });
            break;

        case 'ORDER_CONFIRMED':
            // Wix eCommerce checkout completed — sent from Thank You Page
            // ממפה את ה-order לאותה לוגיקה כמו BOOKING_CONFIRMED
            notifyListeners({
                bookingConfirmed: true,
                bookingId: data.order?.orderId,
                paymentStatus: data.order?.paymentStatus || 'Successful',
                orderData: data.order  // נתוני ה-order המלאים לתצוגה בדף תודה
            });
            break;

        case 'BOOKING_ERROR':
            // Booking failed
            notifyListeners({ bookingError: data.error });
            break;

        case 'ORDER_CONTEXT':
            notifyListeners({
                orderContext: data.orderContext,
                role: data.role || 'organizer',
            });
            break;

        case 'PARTICIPANT_CONTEXT':
            notifyListeners({
                participantContext: data.participantContext,
                role: 'participant',
            });
            break;

        case 'RESPONSE': {
            const cb = pendingCallbacks.get(data.callbackId);
            if (cb) {
                pendingCallbacks.delete(data.callbackId);
                cb(data.result);
            }
            break;
        }

        case 'SKETCH_SELECTION_SAVED':
            notifyListeners({ sketchSelectionSaved: data.selection });
            break;

        case 'UPGRADE_PAYMENT_RESULT':
            notifyListeners({ upgradePaymentResult: data });
            break;

        case 'TOKEN_ACCESS':
            notifyListeners({ tokenAccess: data.token });
            break;

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
 * זיהוי עורך Wix / תצוגה מקדימה — לדילוג על מסך טעינה מלא בזמן עריכה (לא מכביד על העורך).
 * מסתמך בעיקר על document.referrer כשהאפליקציה ב-iframe בתוך editor.wix.com וכו'.
 */
export function isWixEditorOrPreview() {
    if (typeof window === 'undefined') return false;
    try {
        const href = window.location.href || '';
        const ref = document.referrer || '';
        const combined = `${href} ${ref}`;

        // Override ידני לבדיקות
        if (/[?&](noLoadScreen|skipBookingLoader|wixEditor)=1\b/i.test(href)) return true;

        if (/editor\.wix\.com|manage\.wix\.com|editorx\.wix\.com/i.test(combined)) return true;

        if (/\.wix\.com\/(editor|preview|html)/i.test(ref)) return true;

        if (/[?&]preview=/i.test(href) && /wixsite\.com/i.test(href)) return true;
    } catch (e) {
        return false;
    }
    return false;
}

/**
 * Send summary data to Wix for the external booking-summary Custom Element
 * עם Debounce למניעת שליחות מיותרות
 */
export function sendSummaryUpdate(summaryData) {
    if (summaryDebounceTimer) {
        clearTimeout(summaryDebounceTimer);
    }
    summaryDebounceTimer = setTimeout(() => {
        sendToWix('SUMMARY_UPDATE', summaryData);
        summaryDebounceTimer = null;
    }, SUMMARY_DEBOUNCE_DELAY);
}

/**
 * Send a message to Wix with a callback for the response (request-reply pattern).
 * The Wix page script sends back { type: 'RESPONSE', callbackId, result }.
 */
export function sendWithCallback(type, data, callback) {
    const callbackId = ++callbackIdCounter;
    pendingCallbacks.set(callbackId, callback);
    sendToWix(type, { ...data, _callbackId: callbackId });
    setTimeout(() => {
        if (pendingCallbacks.has(callbackId)) {
            pendingCallbacks.delete(callbackId);
            callback({ error: 'timeout' });
        }
    }, 30000);
}

/**
 * Request order context for the post-payment hub
 */
export function requestOrderContext(params = {}) {
    sendToWix('LOAD_ORDER_CONTEXT', params);
}

/**
 * Verify a participant token + phone
 */
export function verifyParticipantAccess(token, phone) {
    sendToWix('VERIFY_ACCESS_TOKEN', { token, phone });
}
