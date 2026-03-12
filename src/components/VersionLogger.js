import React from 'react';

export const APP_VERSION = '1.3.0';
export const BUILD_DATE = '2026-03-12';

const logs = [];

export function addLog(message, type = 'info') {
    const entry = {
        time: new Date().toISOString(),
        message,
        type
    };
    logs.push(entry);
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[v${APP_VERSION}] ${prefix} ${message}`);
}

export function getLogs() {
    return [...logs];
}

// Component — badge קטן בפינה לצורך debug (מוסתר בפרודקשן אפשר להסיר)
export default function VersionLogger() {
    return React.createElement(
        'div',
        {
            style: {
                position: 'fixed',
                bottom: '4px',
                left: '4px',
                fontSize: '10px',
                color: '#aaa',
                fontFamily: 'monospace',
                zIndex: 9999,
                pointerEvents: 'none',
                userSelect: 'none'
            }
        },
        `v${APP_VERSION}`
    );
}
