/**
 * Wix Bridge - Communication layer with Wix Custom Element
 * 
 * This module handles bidirectional communication between
 * the React booking app (embedded in iframe) and the Wix parent page.
 * 
 * Communication patterns:
 * - FROM Wix: window.addEventListener('message', ...) receives data
 * - TO Wix: window.parent.postMessage(...) sends data
 */

// Store for received data from Wix
let wixData = {
    products: null,
    slots: null,
    initialized: false
};

// Callbacks for data updates
const listeners = new Set();

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
 */
function handleWixMessage(event) {
    // In production, validate event.origin
    const { data } = event;

    if (!data || !data.type) return;

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
            notifyListeners({ bookingConfirmed: true, bookingId: data.bookingId });
            break;

        case 'BOOKING_ERROR':
            // Booking failed
            notifyListeners({ bookingError: data.error });
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
 */
export function sendSummaryUpdate(summaryData) {
    sendToWix('SUMMARY_UPDATE', summaryData);
}

